#include "regions.hpp"
namespace optiscope {
static std::string inductionOf(N n) {
  if (n->kind != K::ForStmt)
    return "";
  auto init = n->children[0];
  if (init->kind == K::VarDecl)
    return name(init);
  if (init->kind == K::Assignment && init->children[0]->kind == K::Identifier)
    return init->children[0]->text;
  return "";
}
void Analysis::recommend() {
  for (auto &r : regions) {
    N body = r.node->children.back();
    if (modern) {
      bool uncertain = false;
      walk(body, [&](N node) {
        if (node->kind == K::Opaque || node->kind == K::LambdaExpr ||
            (node->kind == K::CallExpr && !node->noMutation &&
             !pure.count(node->text)))
          uncertain = true;
        if (node->kind == K::Identifier &&
            node->semanticType.find('*') != std::string::npos)
          uncertain = true;
        const bool mutation = node->kind == K::Assignment ||
                              (node->kind == K::UnaryExpr &&
                               (node->text.find("++") != std::string::npos ||
                                node->text.find("--") != std::string::npos));
        if (mutation && !node->children.empty()) {
          auto target = node->children[0];
          if (target->kind == K::Identifier &&
              target->semanticType.find('&') != std::string::npos)
            uncertain = true;
        }
      });
      if (uncertain)
        continue;
    }
    auto mutated = writes(r.node);
    auto addRec = [&](std::string pattern, std::string evidence,
                      std::string advice, std::string caveat) {
      for (auto a : recs)
        if (a.region == r.id && a.pattern == pattern)
          return;
      recs.push_back({"REC" + std::to_string(recs.size() + 1), r.id, pattern,
                      "info", evidence, advice, caveat, r.node->loc.begin.line,
                      r.node->loc.end.line});
    };
    walk(body, [&](N x) {
      if (x->kind == K::BinaryExpr && (x->text == "*" || x->text == "/") &&
          pureExpr(x)) {
        auto vars = ids(x);
        bool stable = !vars.empty();
        for (auto s : vars)
          if (mutated.count(s))
            stable = false;
        if (stable)
          addRec("Loop-invariant arithmetic",
                 "Arithmetic operands (" + x->text +
                     ") are unchanged throughout this loop.",
                 "Consider computing this expression once before the loop.",
                 "Preserve evaluation order, floating-point exceptions and "
                 "zero-iteration behavior; compiler optimization may already "
                 "hoist it.");
      }
      if (x->kind == K::CallExpr && pure.count(x->text)) {
        bool stable = true;
        for (auto a : x->children) {
          if (!pureExpr(a))
            stable = false;
          for (auto v : ids(a))
            if (mutated.count(v))
              stable = false;
        }
        if (stable)
          addRec("Repeated pure function call",
                 "The local function " + x->text +
                     " has a single side-effect-free return expression and "
                     "invariant arguments.",
                 "Consider computing this repeated result once and reusing it "
                 "if profiling shows meaningful cost.",
                 "Do not assume this call is expensive; preserve "
                 "zero-iteration behavior and arithmetic exception semantics.");
      }
    });
    walk(body, [&](N inner) {
      if (inner->kind != K::ForStmt || r.node->kind != K::ForStmt ||
          inner == r.node)
        return;
      walk(inner->children.back(), [&](N x) {
        if (x->kind != K::BinaryExpr || x->text != "==")
          return;
        auto a = x->children[0], b = x->children[1];
        if (a->kind == K::ArrayAccess && b->kind == K::ArrayAccess) {
          auto ai = ids(a->children[1]), bi = ids(b->children[1]);
          auto outerVar = inductionOf(r.node), innerVar = inductionOf(inner);
          if (!((ai.count(outerVar) && bi.count(innerVar)) ||
                (bi.count(outerVar) && ai.count(innerVar))))
            return;
          addRec("Nested pairwise equality",
                 "An equality comparison between two indexed values occurs "
                 "inside nested for loops.",
                 "Consider indexing values with a hash table when the task is "
                 "membership or matching.",
                 "Array equality alone does not prove a replaceable algorithm. "
                 "Preserve duplicate counts, ordering and all side effects; "
                 "hashing uses extra memory.");
        } else if (a->kind == K::ArrayAccess || b->kind == K::ArrayAccess) {
          auto indexed = a->kind == K::ArrayAccess ? a : b,
               other = a->kind == K::ArrayAccess ? b : a;
          if (!ids(indexed->children[1]).count(inductionOf(inner)) ||
              ids(other).count(inductionOf(inner)))
            return;
          auto &ir =
              *std::find_if(regions.begin(), regions.end(),
                            [&](const Region &q) { return q.node == inner; });
          if (!ir.cost.unknown &&
              show(ir.cost).find("log") == std::string::npos &&
              show(ir.cost) != "O(1)")
            addRec("Repeated linear equality scan",
                   "An inner loop with an established linear range compares an "
                   "indexed value for equality.",
                   "If this scan implements repeated membership queries, "
                   "consider unordered_set or unordered_map.",
                   "This is a scan candidate, not proof of a search. Preserve "
                   "duplicates, ordering, mutations and query semantics.");
        }
      });
    });
  }
}
} // namespace optiscope
