#include "recurrences.hpp"
namespace optiscope {
RecurrenceEstimate inferRecurrence(N function) {
  RecurrenceEstimate result;
  result.cost.unknown = true;
  const auto identity = name(function);
  std::vector<N> recursive;
  bool unsupported = false;
  walk(function->children[1], [&](N n) {
    if (n->kind == K::CallExpr) {
      if (n->text == identity)
        recursive.push_back(n);
      else
        unsupported = true;
    }
    if (n->kind == K::ForStmt || n->kind == K::WhileStmt ||
        n->kind == K::RangeForStmt || n->kind == K::DoStmt ||
        n->kind == K::Opaque || n->kind == K::ThrowStmt ||
        n->kind == K::Assignment || n->kind == K::ArrayAccess ||
        n->kind == K::LambdaExpr)
      unsupported = true;
  });
  result.recursiveCalls = recursive.size();
  result.reason = "No recurrence is inferred; no interprocedural algorithm "
                  "proof is claimed.";
  if (recursive.empty())
    return result;
  result.reason = "Recursive calls detected; branching, memoization, graph "
                  "structure, mutation or termination assumptions are "
                  "insufficient for a recurrence solution.";
  if (unsupported || recursive.size() != 1 ||
      function->children[0]->children.size() != 1 || !function->arithmeticType)
    return result;
  const auto parameter = function->children[0]->children[0];
  if (!parameter->arithmeticType || !writes(function->children[1]).empty())
    return result;
  const auto variable = name(parameter);
  const auto call = recursive[0];
  if (call->children.size() != 1)
    return result;
  const auto argument = call->children[0];
  if (argument->kind != K::BinaryExpr || argument->text != "-" ||
      argument->children[0]->kind != K::Identifier ||
      argument->children[0]->text != variable ||
      argument->children[1]->kind != K::Literal ||
      argument->children[1]->text != "1")
    return result;
  bool base = false;
  walk(function->children[1], [&](N n) {
    if (n->kind != K::IfStmt)
      return;
    const bool conditional = n->text == "conditional";
    const size_t index = conditional ? 0 : 1;
    if (n->children.size() <= index + 1)
      return;
    const auto condition = n->children[index];
    if (condition->kind != K::BinaryExpr ||
        condition->children[0]->kind != K::Identifier ||
        condition->children[0]->text != variable ||
        condition->children[1]->kind != K::Literal)
      return;
    const auto limit = condition->children[1]->text;
    if (!((condition->text == "<" && (limit == "1" || limit == "2")) ||
          (condition->text == "<=" && (limit == "0" || limit == "1")) ||
          (condition->text == "==" && limit == "0")))
      return;
    auto branch = n->children[index + 1];
    if (!conditional) {
      if (branch->kind == K::Block && branch->children.size() == 1)
        branch = branch->children[0];
      if (branch->kind != K::ReturnStmt || branch->children.empty())
        return;
      branch = branch->children[0];
    }
    if (branch->kind == K::Literal)
      base = true;
  });
  if (!base)
    return result;
  result.cost.unknown = false;
  result.cost.terms[0].p[variable] = 1;
  result.reason = "One recursive call at n-1 with a literal terminating base "
                  "branch and only scalar arithmetic: T(n)=T(n-1)+O(1), "
                  "estimated O(n). Assumes nonnegative input, termination, "
                  "unit machine arithmetic and no overflow. This standalone "
                  "function model is not substituted into callers.";
  return result;
}
} // namespace optiscope
