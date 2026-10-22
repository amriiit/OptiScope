#include "complexity.hpp"
#include "stl_costs.hpp"
namespace optiscope {
static bool dominates(const Term &a, const Term &b) {
  for (auto [s, e] : b.p) {
    auto it = a.p.find(s);
    if (it == a.p.end() || it->second < e) {
      if (s.rfind("log ", 0) == 0) {
        auto linear = a.p.find(s.substr(4));
        int used = b.p.count(s.substr(4)) ? b.p.at(s.substr(4)) : 0;
        if (linear != a.p.end() && linear->second > used)
          continue;
      }
      return false;
    }
  }
  return true;
}
static Cost normalize(Cost c) {
  std::vector<Term> t;
  for (auto a : c.terms) {
    bool skip = false;
    for (auto b : t)
      if (dominates(b, a))
        skip = true;
    if (skip)
      continue;
    t.erase(std::remove_if(t.begin(), t.end(),
                           [&](Term b) { return dominates(a, b); }),
            t.end());
    t.push_back(a);
  }
  c.terms = t;
  return c;
}
Cost add(Cost a, Cost b) {
  a.unknown |= b.unknown;
  a.terms.insert(a.terms.end(), b.terms.begin(), b.terms.end());
  return normalize(a);
}
Cost mul(Cost a, Cost b) {
  Cost r;
  r.unknown = a.unknown || b.unknown;
  r.terms.clear();
  for (auto x : a.terms)
    for (auto y : b.terms) {
      auto z = x;
      for (auto [s, e] : y.p)
        z.p[s] += e;
      r.terms.push_back(z);
    }
  return normalize(r);
}
std::string show(Cost c) {
  if (c.unknown)
    return "Unknown";
  std::string s = "O(";
  for (size_t i = 0; i < c.terms.size(); i++) {
    if (i)
      s += " + ";
    auto t = c.terms[i];
    if (t.p.empty())
      s += "1";
    bool first = true;
    for (auto [v, e] : t.p) {
      if (!first)
        s += " * ";
      first = false;
      s += (e > 1 && v.rfind("log ", 0) == 0) ? "(" + v + ")" : v;
      if (e > 1)
        s += "^" + std::to_string(e);
    }
  }
  return s + ")";
}
static bool number(N n, double &v) {
  if (n->kind != K::Literal)
    return false;
  try {
    size_t k;
    v = std::stod(n->text, &k);
    return k == n->text.size();
  } catch (...) {
    return false;
  }
}
LoopEstimate loopIterations(N n, const std::set<std::string> &ancestors,
                            const std::set<std::string> &pure, bool modern) {
  Cost iterations;
  std::string reason =
      "Unknown progression or termination; no exact estimate is claimed.";
  std::vector<std::string> assumptions;
  N body = n->children.back();
  std::string induction;
  if (modern && n->kind == K::RangeForStmt) {
    if (!n->sizeSymbol.empty() && n->scalarElements &&
        !n->containerKind.empty()) {
      auto changed = writes(body);
      bool unsafe = changed.count(n->sizeSymbol);
      walk(body, [&](N child) {
        if (child->kind == K::CallExpr && !child->noMutation &&
            !pure.count(child->text))
          unsafe = true;
      });
      if (!unsafe) {
        iterations.terms[0].p[n->sizeSymbol + ".size"] = 1;
        return {iterations,
                "Range iteration over a stable finite container.",
                "",
                {"Range size remains unchanged; iterator operations and "
                 "element binding have unit cost."}};
      }
    }
    iterations.unknown = true;
    return {
        iterations,
        "Range size, element binding or mutation effects are not established.",
        "",
        {}};
  }
  if (n->kind == K::ForStmt) {
    auto init = n->children[0], cond = n->children[1], update = n->children[2];
    N initial;
    if (init->kind == K::VarDecl && !init->children.empty()) {
      induction = name(init);
      initial = init->children[0];
    }
    if (init->kind == K::Assignment && init->text == "=" &&
        init->children[0]->kind == K::Identifier) {
      induction = init->children[0]->text;
      initial = init->children[1];
    }
    bool valid = false, log = false;
    double step = 0, start = 0;
    bool hasStart = initial && number(initial, start);
    if (!induction.empty() && cond->kind == K::BinaryExpr &&
        cond->children[0]->kind == K::Identifier &&
        cond->children[0]->text == induction) {
      auto bound = cond->children[1];
      bool ascending = cond->text == "<" || cond->text == "<=";
      bool descending = cond->text == ">" || cond->text == ">=";
      if (update->kind == K::UnaryExpr &&
          update->children[0]->kind == K::Identifier &&
          update->children[0]->text == induction) {
        step = update->text.find("++") != std::string::npos ? 1 : -1;
        valid = (ascending && step > 0) || (descending && step < 0);
      }
      if (update->kind == K::Assignment &&
          update->children[0]->kind == K::Identifier &&
          update->children[0]->text == induction &&
          number(update->children[1], step)) {
        if (update->text == "+=")
          valid = (ascending && step > 0) || (descending && step < 0);
        if (update->text == "-=")
          valid = (ascending && step < 0) || (descending && step > 0);
        if (update->text == "*=" && step > 1 && ascending && hasStart &&
            start >= 1) {
          valid = true;
          log = true;
        }
        if (update->text == "/=" && step > 1 && descending) {
          double limit;
          valid = number(bound, limit) && limit >= 1 && initial &&
                  (initial->kind == K::Identifier || (hasStart && start >= 1));
          log = valid;
        }
      }
      auto mutated = writes(body);
      auto boundIds = ids(bound);
      bool unsafe = mutated.count(induction);
      for (auto s : boundIds)
        unsafe |= mutated.count(s) || (ancestors.count(s) && !modern);
      bool hasCall = false;
      walk(body, [&](N x) {
        if (x->kind == K::CallExpr && !pure.count(x->text) &&
            !(modern && libraryCost(x).recognized))
          hasCall = true;
      });
      if (modern)
        walk(body, [&](N x) {
          if (x->kind == K::Opaque ||
              (x->kind == K::UnaryExpr && (x->text == "*" || x->text == "&")))
            unsafe = true;
        });
      if (modern)
        walk(body, [&](N x) {
          if (x->kind == K::CallExpr && x->operation == "swap") {
            auto used = ids(x);
            if (used.count(induction))
              unsafe = true;
            for (auto v : boundIds)
              if (used.count(v))
                unsafe = true;
          }
        });
      if (modern)
        walk(body, [&](N x) {
          const bool mutation = x->kind == K::Assignment ||
                                (x->kind == K::UnaryExpr &&
                                 (x->text.find("++") != std::string::npos ||
                                  x->text.find("--") != std::string::npos));
          if (mutation && !x->children.empty()) {
            auto target = x->children[0];
            if (target->kind == K::Identifier &&
                target->semanticType.find('&') != std::string::npos)
              unsafe = true;
          }
          if (bound->kind == K::CallExpr && bound->operation == "size" &&
              x->kind == K::CallExpr && !x->noMutation &&
              !x->containerKind.empty())
            unsafe = true;
        });
      unsafe |= hasCall;
      if (valid && !unsafe) {
        double limit;
        bool literalBound = number(bound, limit);
        std::string symbol;
        if (literalBound && hasStart) {
          reason =
              "Literal initializer and literal bound with monotone constant "
              "progression: fixed work with respect to named input sizes.";
        } else if (ascending && hasStart && bound->kind == K::Identifier) {
          symbol = bound->text;
          reason = log ? "Positive constant start and multiplicative update "
                         "toward a named bound."
                       : "Constant start, named upper bound, and constant "
                         "nonzero step.";
        } else if (descending && literalBound && initial &&
                   initial->kind == K::Identifier) {
          symbol = initial->text;
          reason = log ? "Named initial size repeatedly divided by a "
                         "constant greater than one."
                       : "Named initial size decreases by a constant toward "
                         "a literal lower bound.";
        } else if (modern && ascending && hasStart &&
                   bound->kind == K::CallExpr && bound->noMutation &&
                   bound->operation == "size" && !bound->sizeSymbol.empty()) {
          symbol = bound->sizeSymbol + ".size";
          reason =
              "Monotone iteration toward a stable standard-container size.";
          walk(body, [&](N x) {
            if (x->kind == K::CallExpr && x->sizeSymbol == bound->sizeSymbol &&
                !x->noMutation)
              valid = false;
          });
        } else if (modern && ascending && hasStart &&
                   bound->kind == K::BinaryExpr && bound->text == "*" && !log) {
          auto vars = ids(bound);
          bool safe = true;
          for (auto v : vars)
            if (ancestors.count(v))
              safe = false;
          if (safe && bound->children[0]->kind == K::Identifier &&
              bound->children[1]->kind == K::Identifier) {
            iterations.terms[0].p.clear();
            for (auto v : bound->children)
              iterations.terms[0].p[v->text]++;
            reason = "Product of two stable independent named size bounds.";
          } else
            valid = false;
        } else
          valid = false;
        if (valid && !symbol.empty())
          iterations.terms[0].p[log ? "log " + symbol : symbol] = 1;
        if (valid)
          assumptions = {
              "Named size bounds are treated as independent nonnegative "
              "input parameters, even when demo code initializes them with "
              "literals.",
              "Arithmetic does not overflow; loop body does not mutate the "
              "bound or induction variable; single-threaded execution.",
              "Conservative structural estimate; early returns and branches "
              "may reduce actual work."};
      } else
        valid = false;
    }
    if (!valid) {
      iterations.unknown = true;
      reason = "Cannot establish a safe canonical progression, independent "
               "bound, and known body effects.";
    }
  } else {
    iterations.unknown = true;
    reason = "While-loop termination and iteration count are not inferred in "
             "this MVP.";
  }
  return {iterations, reason, induction, assumptions};
}
} // namespace optiscope
