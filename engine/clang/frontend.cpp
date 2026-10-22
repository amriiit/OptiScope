#include "frontend.hpp"
#include "traversal.hpp"
#include <clang/AST/ASTContext.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/ASTUnit.h>
#include <clang/Lex/Lexer.h>
#include <clang/Tooling/Tooling.h>
#include <fstream>
#include <llvm/ADT/StringExtras.h>
#include <set>
using namespace clang;
namespace optiscope {
namespace {
class Diagnostics : public DiagnosticConsumer {
  FrontendResult &result;

public:
  explicit Diagnostics(FrontendResult &result) : result(result) {}
  void HandleDiagnostic(DiagnosticsEngine::Level level,
                        const Diagnostic &info) override {
    DiagnosticConsumer::HandleDiagnostic(level, info);
    llvm::SmallString<256> message;
    info.FormatDiagnostic(message);
    FrontendDiagnostic diagnostic;
    diagnostic.message = message.str().str();
    diagnostic.severity = level >= DiagnosticsEngine::Error     ? "error"
                          : level == DiagnosticsEngine::Warning ? "warning"
                                                                : "note";
    if (info.hasSourceManager() && info.getLocation().isValid()) {
      auto &manager = info.getSourceManager();
      auto loc = manager.getExpansionLoc(info.getLocation());
      diagnostic.line = manager.getSpellingLineNumber(loc);
      diagnostic.column = manager.getSpellingColumnNumber(loc);
      diagnostic.file = manager.getFilename(loc).str();
      diagnostic.inMainFile = manager.isWrittenInMainFile(loc);
    }
    result.diagnostics.push_back(diagnostic);
  }
};
class Normalizer : public RecursiveASTVisitor<Normalizer> {
  ASTContext &context;
  SourceManager &sm;
  FrontendResult &output;
  std::set<unsigned> functions;
  bool unsafeFunction = false;
  static std::string functionName(const clang::FunctionDecl *f) {
    if (f->isMain())
      return "main";
    std::string result = f->getQualifiedNameAsString() + "(";
    for (unsigned i = 0; i < f->getNumParams(); ++i) {
      if (i)
        result += ",";
      result += f->getParamDecl(i)->getType().getAsString();
    }
    return result + ")";
  }
  bool inMain(SourceLocation loc) const {
    return loc.isValid() && sm.isWrittenInMainFile(sm.getExpansionLoc(loc));
  }
  Position position(SourceLocation loc) const {
    loc = sm.getExpansionLoc(loc);
    if (loc.isInvalid() || !sm.isWrittenInMainFile(loc))
      return {};
    return {int(sm.getSpellingLineNumber(loc)),
            int(sm.getSpellingColumnNumber(loc)), sm.getFileOffset(loc)};
  }
  Loc location(SourceRange range, bool statement = false) const {
    if (range.isInvalid())
      return {};
    auto begin = sm.getExpansionLoc(range.getBegin());
    auto end = sm.getExpansionLoc(range.getEnd());
    auto after = Lexer::getLocForEndOfToken(end, 0, sm, context.getLangOpts());
    if (statement) {
      auto next = Lexer::findNextToken(end, sm, context.getLangOpts());
      if (next && next->is(tok::semi))
        after = Lexer::getLocForEndOfToken(next->getLocation(), 0, sm,
                                           context.getLangOpts());
    }
    return {position(begin), position(after)};
  }
  N node(Kind kind, std::string text, SourceRange range,
         std::vector<N> children = {}, bool statement = false) {
    auto n = std::make_shared<Node>(kind, std::move(text),
                                    location(range, statement));
    n->children = std::move(children);
    return n;
  }
  N empty() { return std::make_shared<Node>(K::Empty, "", Loc{}); }
  const Expr *strip(const Expr *e) const {
    return e ? e->IgnoreParenImpCasts() : nullptr;
  }
  std::string objectName(const Expr *e) const {
    e = strip(e);
    if (auto d = dyn_cast_or_null<DeclRefExpr>(e))
      return d->getDecl()->getNameAsString();
    if (auto m = dyn_cast_or_null<MemberExpr>(e))
      return objectName(m->getBase()) + "." +
             m->getMemberDecl()->getNameAsString();
    return "";
  }
  std::string typeName(QualType t) const {
    return t.getNonReferenceType().getUnqualifiedType().getAsString();
  }
  bool standardContext(const Decl *declaration) const {
    for (auto context = declaration->getDeclContext(); context;
         context = context->getParent())
      if (auto ns = dyn_cast<NamespaceDecl>(context))
        if (ns->isStdNamespace())
          return true;
    return false;
  }
  std::string containerKind(QualType type) const {
    if (auto record = type.getNonReferenceType()->getAsCXXRecordDecl())
      if (standardContext(record))
        return record->getNameAsString();
    return "";
  }
  bool scalarElements(QualType t) const {
    t = t.getNonReferenceType();
    if (auto r = t->getAsCXXRecordDecl()) {
      if (auto spec = dyn_cast<ClassTemplateSpecializationDecl>(r)) {
        const auto &args = spec->getTemplateArgs();
        if (args.size() && args[0].getKind() == TemplateArgument::Type) {
          auto v = args[0].getAsType();
          bool scalar = v->isArithmeticType() || v->isPointerType();
          const auto kind = containerKind(t);
          if ((kind == "map" || kind == "multimap" ||
               kind == "unordered_map") &&
              args.size() > 1 && args[1].getKind() == TemplateArgument::Type) {
            auto value = args[1].getAsType();
            scalar =
                scalar && (value->isArithmeticType() || value->isPointerType());
          }
          for (unsigned i = 1; i < args.size(); i++)
            if (args[i].getKind() == TemplateArgument::Type)
              if (auto policy = args[i].getAsType()->getAsCXXRecordDecl())
                if (!standardContext(policy))
                  scalar = false;
          return scalar;
        }
      }
    }
    return false;
  }
  N variable(const clang::VarDecl *v) {
    std::vector<N> children;
    if (v->hasInit())
      children.push_back(convert(v->getInit()));
    auto n = node(K::VarDecl, "var " + v->getNameAsString(),
                  v->getSourceRange(), children);
    n->semanticType = v->getType().getAsString();
    n->arithmeticType = v->getType()->isIntegerType();
    return n;
  }
  const Expr *iteratorObject(const Expr *e) const {
    e = strip(e);
    if (auto call = dyn_cast_or_null<CXXMemberCallExpr>(e)) {
      auto method = call->getMethodDecl();
      if (method && (method->getNameAsString() == "begin" ||
                     method->getNameAsString() == "end" ||
                     method->getNameAsString() == "cbegin" ||
                     method->getNameAsString() == "cend"))
        return call->getImplicitObjectArgument();
    }
    return nullptr;
  }
  void callFacts(N n, const clang::CallExpr *call) {
    const auto *callee = call->getDirectCallee();
    if (!callee)
      return;
    n->operation = callee->getNameAsString();
    n->libraryCall = false;
    for (auto dc = callee->getDeclContext(); dc; dc = dc->getParent())
      if (auto ns = dyn_cast<NamespaceDecl>(dc))
        if (ns->isStdNamespace())
          n->libraryCall = true;
    if (auto member = dyn_cast<CXXMemberCallExpr>(call)) {
      auto object = member->getImplicitObjectArgument();
      if (object) {
        n->receiverType = typeName(object->getType());
        n->containerKind = containerKind(object->getType());
        n->sizeSymbol = objectName(object);
        n->scalarElements = scalarElements(object->getType());
      }
    } else if (auto op = dyn_cast<CXXOperatorCallExpr>(call)) {
      if (isa<CXXMethodDecl>(callee) && op->getNumArgs()) {
        n->receiverType = typeName(op->getArg(0)->getType());
        n->containerKind = containerKind(op->getArg(0)->getType());
        n->sizeSymbol = objectName(op->getArg(0));
        n->scalarElements = scalarElements(op->getArg(0)->getType());
      }
    } else if (call->getNumArgs() >= 2) {
      auto first = iteratorObject(call->getArg(0)),
           last = iteratorObject(call->getArg(1));
      if (first && last && !objectName(first).empty() &&
          objectName(first) == objectName(last)) {
        n->receiverType = typeName(first->getType());
        n->containerKind = containerKind(first->getType());
        n->sizeSymbol = objectName(first);
        n->scalarElements = scalarElements(first->getType());
      }
    }
    if (n->receiverType.empty() &&
        (n->operation == "min" || n->operation == "max" ||
         n->operation == "swap")) {
      n->scalarElements = call->getNumArgs() == 2;
      for (auto arg : call->arguments())
        n->scalarElements =
            n->scalarElements && arg->getType()->isArithmeticType();
    }
    if (n->receiverType.find("thread") != std::string::npos ||
        n->operation == "async")
      output.runtimeLimitations.push_back(
          "Multithreaded execution is not supported by the single-threaded "
          "region timer.");
    n->noMutation =
        n->libraryCall && (n->operation == "size" || n->operation == "empty" ||
                           n->operation == "begin" || n->operation == "end" ||
                           n->operation == "cbegin" || n->operation == "cend");
  }
  N loop(Kind kind, const Stmt *s, std::vector<N> children) {
    auto n = node(kind, kindName(kind), s->getSourceRange(),
                  std::move(children), true);
    if (unsafeFunction) {
      n->safeInstrumentation = false;
      n->instrumentationReason =
          "constexpr or labelled/goto function: inserting timer scopes could "
          "change constant evaluation or jump legality.";
    }
    if (s->getBeginLoc().isMacroID() || s->getEndLoc().isMacroID()) {
      n->safeInstrumentation = false;
      n->instrumentationReason = "Loop boundary comes from a macro expansion; "
                                 "no source rewrite is attempted.";
    }
    return n;
  }

public:
  Normalizer(ASTContext &c, FrontendResult &o)
      : context(c), sm(c.getSourceManager()), output(o) {}
  N convert(const Stmt *s) {
    if (!s)
      return empty();
    if (auto e = dyn_cast<Expr>(s)) {
      auto clean = e->IgnoreParenImpCasts();
      if (clean != e)
        return convert(clean);
    }
    if (auto b = dyn_cast<CompoundStmt>(s)) {
      std::vector<N> children;
      for (auto child : b->body())
        children.push_back(convert(child));
      return node(K::Block, "", s->getSourceRange(), children);
    }
    if (auto d = dyn_cast<DeclStmt>(s)) {
      std::vector<N> vars;
      for (auto decl : d->decls())
        if (auto v = dyn_cast<clang::VarDecl>(decl))
          vars.push_back(variable(v));
      if (vars.size() == 1)
        return vars[0];
      return node(K::Block, "declarations", s->getSourceRange(), vars);
    }
    if (auto f = dyn_cast<clang::ForStmt>(s))
      return loop(K::ForStmt, s,
                  {convert(f->getInit()), convert(f->getCond()),
                   convert(f->getInc()), convert(f->getBody())});
    if (auto f = dyn_cast<CXXForRangeStmt>(s)) {
      auto n = loop(K::RangeForStmt, s,
                    {variable(f->getLoopVariable()), convert(f->getRangeInit()),
                     convert(f->getBody())});
      n->sizeSymbol = objectName(f->getRangeInit());
      n->receiverType = typeName(f->getRangeInit()->getType());
      n->containerKind = containerKind(f->getRangeInit()->getType());
      if (f->getRangeInit()->getType()->isArrayType())
        n->containerKind = "builtin_array";
      n->scalarElements = f->getLoopVariable()->getType()->isReferenceType() ||
                          f->getLoopVariable()->getType()->isArithmeticType();
      return n;
    }
    if (auto w = dyn_cast<clang::WhileStmt>(s))
      return loop(K::WhileStmt, s,
                  {convert(w->getCond()), convert(w->getBody())});
    if (auto d = dyn_cast<DoStmt>(s))
      return loop(K::DoStmt, s, {convert(d->getCond()), convert(d->getBody())});
    if (auto i = dyn_cast<clang::IfStmt>(s))
      return node(K::IfStmt, "if", s->getSourceRange(),
                  {convert(i->getInit()), convert(i->getCond()),
                   convert(i->getThen()), convert(i->getElse())});
    if (auto ternary = dyn_cast<ConditionalOperator>(s))
      return node(K::IfStmt, "conditional", s->getSourceRange(),
                  {convert(ternary->getCond()), convert(ternary->getTrueExpr()),
                   convert(ternary->getFalseExpr())});
    if (auto clean = dyn_cast<ExprWithCleanups>(s))
      return convert(clean->getSubExpr());
    if (auto sw = dyn_cast<SwitchStmt>(s))
      return node(K::SwitchStmt, "switch", s->getSourceRange(),
                  {convert(sw->getCond()), convert(sw->getBody())});
    if (auto cs = dyn_cast<SwitchCase>(s))
      return convert(cs->getSubStmt());
    if (auto r = dyn_cast<clang::ReturnStmt>(s))
      return node(K::ReturnStmt, "return", s->getSourceRange(),
                  {convert(r->getRetValue())});
    if (isa<BreakStmt>(s))
      return node(K::BreakStmt, "break", s->getSourceRange());
    if (isa<ContinueStmt>(s))
      return node(K::ContinueStmt, "continue", s->getSourceRange());
    if (isa<CXXThrowExpr>(s))
      return node(K::ThrowStmt, "throw", s->getSourceRange());
    if (isa<NullStmt>(s))
      return empty();
    if (auto r = dyn_cast<DeclRefExpr>(s)) {
      auto n = node(K::Identifier, r->getDecl()->getNameAsString(),
                    s->getSourceRange());
      n->semanticType = r->getDecl()->getType().getAsString();
      return n;
    }
    if (auto i = dyn_cast<IntegerLiteral>(s))
      return node(K::Literal, llvm::toString(i->getValue(), 10, false),
                  s->getSourceRange());
    if (auto b = dyn_cast<CXXBoolLiteralExpr>(s))
      return node(K::Literal, b->getValue() ? "true" : "false",
                  s->getSourceRange());
    if (auto str = dyn_cast<StringLiteral>(s))
      return node(K::Literal, "\"" + str->getString().str() + "\"",
                  s->getSourceRange());
    if (auto f = dyn_cast<FloatingLiteral>(s))
      return node(K::Literal, std::to_string(f->getValue().convertToDouble()),
                  s->getSourceRange());
    if (auto b = dyn_cast<BinaryOperator>(s))
      return node(b->isAssignmentOp() ? K::Assignment : K::BinaryExpr,
                  b->getOpcodeStr().str(), s->getSourceRange(),
                  {convert(b->getLHS()), convert(b->getRHS())});
    if (auto u = dyn_cast<UnaryOperator>(s)) {
      auto op = UnaryOperator::getOpcodeStr(u->getOpcode()).str();
      if (u->isPostfix())
        op = "post" + op;
      return node(K::UnaryExpr, op, s->getSourceRange(),
                  {convert(u->getSubExpr())});
    }
    if (auto a = dyn_cast<ArraySubscriptExpr>(s))
      return node(K::ArrayAccess, "[]", s->getSourceRange(),
                  {convert(a->getBase()), convert(a->getIdx())});
    if (auto cast = dyn_cast<CastExpr>(s)) {
      if (cast->getType()->isArithmeticType())
        return convert(cast->getSubExpr());
    }
    if (auto op = dyn_cast<CXXOperatorCallExpr>(s)) {
      if (op->getOperator() == OO_Subscript && op->getNumArgs() == 2) {
        auto kind = containerKind(op->getArg(0)->getType());
        if (kind == "vector" || kind == "basic_string" || kind == "array" ||
            kind == "deque")
          return node(K::ArrayAccess, "[]", s->getSourceRange(),
                      {convert(op->getArg(0)), convert(op->getArg(1))});
      }
    }
    if (auto l = dyn_cast<LambdaExpr>(s))
      return node(K::LambdaExpr, "lambda (body is a separate callable)",
                  s->getSourceRange());
    if (auto c = dyn_cast<clang::CallExpr>(s)) {
      std::vector<N> args;
      for (auto arg : c->arguments())
        args.push_back(convert(arg));
      auto n = node(K::CallExpr,
                    c->getDirectCallee() ? functionName(c->getDirectCallee())
                                         : "indirect/dependent call",
                    s->getSourceRange(), args);
      callFacts(n, c);
      return n;
    }
    if (auto m = dyn_cast<MemberExpr>(s))
      return node(K::Opaque, "member " + m->getMemberDecl()->getNameAsString(),
                  s->getSourceRange(), {convert(m->getBase())});
    // Do not discard children when no cost model exists. Nested loops remain
    // visible.
    std::vector<N> children;
    for (auto child : s->children())
      if (child)
        children.push_back(convert(child));
    return node(K::Opaque, s->getStmtClassName(), s->getSourceRange(),
                children);
  }
  void addFunction(const clang::FunctionDecl *f, std::string identity = "") {
    if (!f->hasBody() || !inMain(f->getBeginLoc()) ||
        (f->isImplicit() && identity.empty()))
      return;
    auto body = f->getBody();
    auto offset = position(body->getBeginLoc()).offset;
    if (!functions.insert(offset).second)
      return;
    bool previous = unsafeFunction;
    unsafeFunction = f->isConstexpr();
    std::function<void(const Stmt *)> jumps = [&](const Stmt *s) {
      if (!s)
        return;
      if (isa<GotoStmt>(s) || isa<LabelStmt>(s))
        unsafeFunction = true;
      for (auto child : s->children())
        jumps(child);
    };
    jumps(body);
    if (f->isMain() && !isa<CompoundStmt>(body))
      output.runtimeLimitations.push_back(
          "Function-try-block main is not instrumented by this rewriter.");
    std::vector<N> params;
    for (auto p : f->parameters())
      params.push_back(variable(p));
    auto parameters = node(K::Parameters, "", f->getSourceRange(), params);
    auto n = node(K::FunctionDecl,
                  "function " + (identity.empty() ? functionName(f) : identity),
                  f->getSourceRange(), {parameters, convert(body)});
    n->semanticType = f->getReturnType().getAsString();
    n->arithmeticType = f->getReturnType()->isArithmeticType();
    output.tree->children.push_back(n);
    unsafeFunction = previous;
  }
  bool VisitFunctionDecl(clang::FunctionDecl *f) {
    if (auto m = dyn_cast<CXXMethodDecl>(f))
      if (m->getParent()->isLambda())
        return true;
    if (f->isThisDeclarationADefinition())
      addFunction(f);
    return true;
  }
  bool VisitLambdaExpr(LambdaExpr *l) {
    if (inMain(l->getBeginLoc()))
      addFunction(l->getCallOperator(),
                  "lambda@" +
                      std::to_string(position(l->getBeginLoc()).offset));
    return true;
  }
  bool VisitVarDecl(clang::VarDecl *v) {
    if (inMain(v->getBeginLoc()) &&
        v->getType().getAsString().find("thread") != std::string::npos)
      output.runtimeLimitations.push_back(
          "std::thread is outside single-threaded profiling semantics.");
    return true;
  }
};
} // namespace
FrontendResult parseClang(const std::string &file) {
  std::ifstream input(file, std::ios::binary);
  std::string source((std::istreambuf_iterator<char>(input)), {});
  FrontendResult result;
  Diagnostics diagnostics(result);
  auto unit = tooling::buildASTFromCodeWithArgs(
      source, {"-std=c++17", "-ferror-limit=8", "-fno-color-diagnostics"}, file,
      "/usr/bin/clang++-14", std::make_shared<PCHContainerOperations>(),
      tooling::getClangStripDependencyFileAdjuster(), {}, &diagnostics);
  if (!unit || unit->getDiagnostics().hasErrorOccurred())
    return result;
  result.tree = std::make_shared<Node>(
      K::Program, "",
      Loc{{1, 1, 0},
          {int(std::count(source.begin(), source.end(), '\n') + 1), 1,
           source.size()}});
  Normalizer normalizer(unit->getASTContext(), result);
  normalizer.TraverseDecl(unit->getASTContext().getTranslationUnitDecl());
  std::stable_sort(
      result.tree->children.begin(), result.tree->children.end(),
      [](N a, N b) { return a->loc.begin.offset < b->loc.begin.offset; });
  return result;
}
} // namespace optiscope
