#include "stl_costs.hpp"
namespace optiscope {
OperationCost libraryCost(N n) {
  OperationCost result;
  result.cost.unknown = true;
  if (!n->libraryCall)
    return result;
  auto has = [&](const std::string &kind) { return n->containerKind == kind; };
  bool random =
      has("vector") || has("array") || has("deque") || has("basic_string");
  bool sequence = random || has("list");
  bool ordered = has("set") || has("multiset") || has("map") || has("multimap");
  bool hashed = has("unordered_map") || has("unordered_set");
  const auto &op = n->operation;
  Cost size;
  size.terms[0].p[n->sizeSymbol + ".size"] = 1;
  Cost logarithm;
  logarithm.terms[0].p["log " + n->sizeSymbol + ".size"] = 1;
  auto known = [&](Cost cost, std::string why) {
    result.cost = cost;
    result.recognized = true;
    result.explanation = std::move(why);
    return result;
  };
  if ((sequence || ordered || hashed || has("queue") || has("stack") ||
       has("priority_queue")) &&
      n->noMutation)
    return known({}, "Standard container size/empty/iterator accessor: unit "
                     "source-level operation cost.");
  if ((op == "min" || op == "max" || op == "swap") && n->scalarElements &&
      n->children.size() == 2)
    return known(
        {}, "Standard two-scalar min/max/swap with unit comparison/copy cost.");
  if (n->sizeSymbol.empty() || !n->scalarElements)
    return result;
  if ((op == "sort" || op == "stable_sort") && random &&
      n->children.size() <= 2) {
    if (op == "stable_sort")
      return known(mul(size, mul(logarithm, logarithm)),
                   "C++17 stable_sort conservative O(N log^2 N) comparison "
                   "upper bound when auxiliary allocation is unavailable; "
                   "scalar comparator/move assumption.");
    return known(
        mul(size, logarithm),
        "std::sort on a complete random-access range of scalar values: O(N log "
        "N) comparisons, unit comparator/move assumption.");
  }
  if ((op == "reverse" || op == "find" || op == "accumulate" ||
       op == "max_element" || op == "min_element" || op == "count") &&
      sequence &&
      n->children.size() <=
          (op == "reverse" || op == "max_element" || op == "min_element" ? 2
                                                                         : 3))
    return known(size, "Full standard-container range traversal; assumes "
                       "scalar comparison/arithmetic and no custom callable.");
  if ((op == "lower_bound" || op == "upper_bound" || op == "binary_search") &&
      sequence && n->children.size() <= 3)
    return known(
        random ? logarithm : size,
        random ? "Binary-search comparisons and random-access advancement are "
                 "logarithmic; sorted-range precondition."
               : "Forward/bidirectional iterator advancement is linear despite "
                 "logarithmic comparisons; sorted-range precondition.");
  if ((op == "push_back" || op == "emplace_back" || op == "insert" ||
       op == "erase") &&
      has("vector"))
    return known(
        size,
        "Vector mutation worst-case linear due to reallocation or shifting; "
        "append is amortized constant under standard growth assumptions.");
  if ((op == "insert" || op == "erase" || op == "find" || op == "count") &&
      ordered && n->children.size() == 1)
    return known(
        (has("multiset") || has("multimap")) ? size : logarithm,
        "Ordered associative-container single-key operation: logarithmic under "
        "unit scalar comparisons. Range overloads are not modeled.");
  if ((op == "insert" || op == "erase" || op == "find" || op == "count" ||
       op == "operator[]") &&
      hashed)
    return known(
        size,
        "Unordered-container worst-case linear; average expected constant "
        "requires a suitable hash distribution and load factor.");
  if ((op == "push" || op == "pop") && has("priority_queue"))
    return known(op == "pop" ? logarithm : size,
                 "Priority-queue push/pop: heap adjustment is "
                 "logarithmic; vector-backed push may reallocate "
                 "linearly. Conservative linear upper bound.");
  return result;
}
} // namespace optiscope
