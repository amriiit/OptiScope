#include "instrumenter.hpp"
namespace optiscope {
std::string instrument(std::string source, const Analysis &analysis) {
  struct Edit {
    size_t pos;
    std::string value;
  };
  std::vector<Edit> edits;
  for (auto r : analysis.regions) {
    if (!r.node->safeInstrumentation)
      continue;
    int i = std::stoi(r.id.substr(1));
    edits.push_back({r.node->loc.begin.offset,
                     "{ optiscope_internal::Timer optiscope_region_" +
                         std::to_string(i) + "(" + std::to_string(i) + "); "});
    edits.push_back({r.node->loc.end.offset, " }"});
  }
  for (auto f : analysis.tree->children)
    if (name(f) == "main")
      edits.push_back({f->children[1]->loc.begin.offset + 1,
                       " optiscope_internal::Total optiscope_total; "});
  std::stable_sort(edits.begin(), edits.end(),
                   [](auto a, auto b) { return a.pos > b.pos; });
  for (auto e : edits)
    source.insert(e.pos, e.value);
  return std::string(profilerRuntime()) + "\n#line 1 \"uploaded.cpp\"\n" +
         source;
}
} // namespace optiscope
