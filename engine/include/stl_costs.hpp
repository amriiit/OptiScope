#pragma once
#include "complexity.hpp"
namespace optiscope {
struct OperationCost {
  Cost cost;
  bool recognized = false;
  std::string explanation;
};
OperationCost libraryCost(N call);
} // namespace optiscope
