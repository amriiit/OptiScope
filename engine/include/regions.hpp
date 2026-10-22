#pragma once
#include "complexity.hpp"
namespace optiscope {
struct Region {
  N node;
  std::string id, fn, reason;
  Cost cost;
  std::vector<std::string> assumptions;
  int depth;
};
struct Rec {
  std::string id, region, pattern, severity, evidence, advice, caveat;
  int start, end;
};
// One context per parsed program; no shared analysis state.
struct Analysis {
  N tree;
  std::vector<Region> regions;
  std::vector<Rec> recs;
  std::vector<std::string> warnings;
  std::map<std::string, N> funcs;
  std::set<std::string> pure;
  int maxDepth = 0, forCount = 0, whileCount = 0;
  Cost overall;
  bool modern = false;
  explicit Analysis(N tree, bool modern = false) : tree(tree), modern(modern) {}
  void run();
  Cost analyze(N n, std::string fn, int depth, std::set<std::string> ancestors,
               bool conditional = false);
  void recommend();
  void symbols(N n, std::vector<std::set<std::string>> &scopes);
};
} // namespace optiscope
