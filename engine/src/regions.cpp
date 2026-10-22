#include "regions.hpp"
#include "stl_costs.hpp"
namespace optiscope {
Cost Analysis::analyze(N n, std::string fn, int depth,
                       std::set<std::string> ancestors, bool conditional) {
  if (n->kind == K::ForStmt || n->kind == K::WhileStmt ||
      (modern && (n->kind == K::RangeForStmt || n->kind == K::DoStmt))) {
    int idx = regions.size();
    std::string id = "R" + std::to_string(idx + 1);
    n->regionId = id;
    regions.push_back({n, id, fn, "", {}, {}, depth + 1});
    maxDepth = std::max(maxDepth, depth + 1);
    if (n->kind == K::ForStmt)
      forCount++;
    else
      whileCount++;
    const auto estimate = loopIterations(n, ancestors, pure, modern);
    const auto &iterations = estimate.cost;
    const auto &reason = estimate.reason;
    const auto &assumptions = estimate.assumptions;
    const auto &induction = estimate.induction;
    N body = n->children.back();
    if (!induction.empty())
      ancestors.insert(induction);
    Cost bodyCost = analyze(body, fn, depth + 1, ancestors, conditional);
    if (modern && !induction.empty()) {
      // A triangular inner bound is a local cost in i. Bound it by this
      // loop's iteration family when composing the enclosing upper envelope.
      Cost substituted;
      substituted.terms.clear();
      substituted.unknown = bodyCost.unknown;
      for (auto term : bodyCost.terms) {
        int exponent = term.p.count(induction) ? term.p[induction] : 0;
        term.p.erase(induction);
        Cost base;
        base.terms = {term};
        for (int i = 0; i < exponent; i++)
          base = mul(base, iterations);
        substituted = add(substituted, base);
      }
      bodyCost = substituted;
    }
    auto c = mul(iterations, bodyCost);
    auto &r = regions[idx];
    r.cost = c;
    r.reason =
        reason + " Body cost: " + show(bodyCost) +
        "; nested costs multiply, sequential costs use their dominant terms.";
    r.assumptions = assumptions;
    if (conditional)
      r.assumptions.push_back("Conditionally executed: estimate is an upper "
                              "envelope when this branch is reached.");
    return c;
  }
  if (modern && (n->kind == K::Opaque || n->kind == K::LambdaExpr ||
                 n->kind == K::ThrowStmt)) {
    for (auto child : n->children)
      analyze(child, fn, depth, ancestors, conditional);
    return {true, {Term{}}};
  }
  if (n->kind == K::CallExpr) {
    if (modern) {
      const auto modeled = libraryCost(n);
      if (modeled.recognized) {
        Cost cost = modeled.cost;
        for (auto child : n->children)
          cost = add(cost, analyze(child, fn, depth, ancestors, conditional));
        return cost;
      }
    }
    bool scalarPrint = n->text == "printf" && !n->children.empty() &&
                       n->children[0]->kind == K::Literal &&
                       n->children[0]->text.find("%s") == std::string::npos &&
                       n->children[0]->text.find("%n") == std::string::npos;
    for (auto a : n->children)
      scalarPrint = scalarPrint && pureExpr(a);
    if (!pure.count(n->text) && !scalarPrint)
      return {true, {Term{}}};
  }
  Cost c;
  for (auto child : n->children)
    c = add(c, analyze(child, fn, depth, ancestors,
                       conditional || n->kind == K::IfStmt));
  return c;
}
void Analysis::symbols(N n, std::vector<std::set<std::string>> &scopes) {
  bool enter = n->kind == K::Block || n->kind == K::FunctionDecl ||
               n->kind == K::ForStmt;
  if (enter)
    scopes.emplace_back();
  if (n->kind == K::VarDecl) {
    auto v = name(n);
    if (!scopes.back().insert(v).second)
      warnings.push_back("Duplicate declaration in a lexical scope: " + v +
                         " (line " + std::to_string(n->loc.begin.line) +
                         "). Compiler validation is required.");
  }
  if (n->kind == K::Identifier) {
    bool found = false;
    for (auto it = scopes.rbegin(); it != scopes.rend(); ++it)
      if (it->count(n->text))
        found = true;
    if (!found)
      warnings.push_back("Unresolved identifier " + n->text + " at line " +
                         std::to_string(n->loc.begin.line) +
                         "; compiler validation is required.");
  }
  for (auto c : n->children)
    symbols(c, scopes);
  if (enter)
    scopes.pop_back();
}
void Analysis::run() {
  for (auto f : tree->children)
    funcs[name(f)] = f;
  for (auto [fn, f] : funcs) {
    auto b = f->children[1];
    if (b->children.size() == 1 && b->children[0]->kind == K::ReturnStmt) {
      auto e = b->children[0]->children[0];
      auto allowed = std::set<std::string>{};
      for (auto p : f->children[0]->children)
        allowed.insert(name(p));
      bool ok = pureExpr(e);
      if (modern)
        for (auto p : f->children[0]->children)
          if (p->semanticType.find('&') != std::string::npos ||
              p->semanticType.find('*') != std::string::npos)
            ok = false;
      for (auto v : ids(e))
        if (!allowed.count(v))
          ok = false;
      if (ok)
        pure.insert(fn);
    }
  }
  for (auto f : tree->children)
    overall = add(overall, analyze(f->children[1], name(f), 0, {}));
  recommend();
  std::vector<std::set<std::string>> scopes(1);
  if (!modern)
    symbols(tree, scopes);
  if (!modern)
    warnings.push_back(
        "Subset parser, not a full C++ semantic compiler. Estimates "
        "parameterize "
        "named size variables; literal-only loops are O(1). Function summary "
        "is "
        "the dominant structural cost across definitions, not a whole-program "
        "call-graph proof. Bounded scalar printf calls are modeled as unit "
        "cost; "
        "external I/O latency is excluded from the complexity model.");
  warnings.push_back(
      "Unknown calls and while loops make enclosing estimates Unknown. Branch "
      "estimates are conservative. Array bounds, overflow, recursion and "
      "arbitrary control flow are not proved.");
  if (!funcs.count("main"))
    warnings.push_back("No main() definition: static analysis only.");
}
} // namespace optiscope
