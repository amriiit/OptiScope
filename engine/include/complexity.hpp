#pragma once
#include "traversal.hpp"
namespace optiscope {
struct Term {
  std::map<std::string, int> p;
};
struct Cost {
  bool unknown = false;
  std::vector<Term> terms = {Term{}};
};
struct LoopEstimate {
  Cost cost;
  std::string reason, induction;
  std::vector<std::string> assumptions;
};
LoopEstimate loopIterations(N n, const std::set<std::string> &ancestors,
                            const std::set<std::string> &pure,
                            bool modern = false);
Cost add(Cost a, Cost b);
Cost mul(Cost a, Cost b);
std::string show(Cost c);
} // namespace optiscope
