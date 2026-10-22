#include "serialization.hpp"
namespace optiscope {
std::string strings(const std::vector<std::string> &a) {
  std::string s = "[";
  for (size_t i = 0; i < a.size(); i++) {
    if (i)
      s += ",";
    s += quote(a[i]);
  }
  return s + "]";
}
void serialize(const Analysis &a, std::ostream &out) {
  out << "{\"success\":true,\"errors\":[],\"warnings\":" << strings(a.warnings)
      << ",\"summary\":{\"functionsDetected\":" << a.tree->children.size()
      << ",\"loopsDetected\":" << a.regions.size()
      << ",\"forLoops\":" << a.forCount << ",\"whileLoops\":" << a.whileCount
      << ",\"maxNestingDepth\":" << a.maxDepth
      << ",\"worstEstimatedComplexity\":" << quote(show(a.overall))
      << ",\"totalMeasuredRuntimeMs\":null},\"hasMain\":"
      << (a.funcs.count("main") ? "true" : "false")
      << ",\"ast\":" << astJSON(a.tree) << ",\"regions\":[";
  for (size_t i = 0; i < a.regions.size(); i++) {
    if (i)
      out << ",";
    auto r = a.regions[i];
    out << "{\"id\":" << quote(r.id)
        << ",\"type\":" << quote(kindName(r.node->kind))
        << ",\"functionName\":" << quote(r.fn)
        << ",\"startLine\":" << r.node->loc.begin.line
        << ",\"endLine\":" << r.node->loc.end.line
        << ",\"startOffset\":" << r.node->loc.begin.offset
        << ",\"endOffset\":" << r.node->loc.end.offset
        << ",\"estimatedComplexity\":" << quote(show(r.cost))
        << ",\"reasoning\":" << quote(r.reason)
        << ",\"assumptions\":" << strings(r.assumptions)
        << ",\"measurement\":null}";
  }
  out << "],\"recommendations\":[";
  for (size_t i = 0; i < a.recs.size(); i++) {
    if (i)
      out << ",";
    auto r = a.recs[i];
    out << "{\"id\":" << quote(r.id) << ",\"regionId\":" << quote(r.region)
        << ",\"pattern\":" << quote(r.pattern)
        << ",\"severity\":" << quote(r.severity) << ",\"startLine\":" << r.start
        << ",\"endLine\":" << r.end << ",\"evidence\":" << quote(r.evidence)
        << ",\"recommendation\":" << quote(r.advice)
        << ",\"caveat\":" << quote(r.caveat) << "}";
  }
  out << "]}";
}
} // namespace optiscope
