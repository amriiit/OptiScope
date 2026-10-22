#pragma once
#include "complexity.hpp"
namespace optiscope {
struct RecurrenceEstimate {
  Cost cost;
  int recursiveCalls = 0;
  std::string reason;
};
RecurrenceEstimate inferRecurrence(N function);
} // namespace optiscope
