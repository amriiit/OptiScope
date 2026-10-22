#include "frontend.hpp"
#include "instrumenter.hpp"
#include "recurrences.hpp"
#include "regions.hpp"
#include "serialization.hpp"
#include "stl_costs.hpp"
#include <fstream>
#include <llvm/Support/JSON.h>
#include <llvm/Support/raw_ostream.h>
N root;
std::vector<std::string> parseErrors;
int main(int argc, char **argv) {
  if (argc != 3)
    return 2;
  auto frontend = optiscope::parseClang(argv[1]);
  llvm::json::Array diagnostics, errors;
  bool missingHeader = false, compilerLimit = false;
  for (const auto &d : frontend.diagnostics) {
    diagnostics.push_back(llvm::json::Object{{"message", d.message},
                                             {"severity", d.severity},
                                             {"file", d.file},
                                             {"startLine", d.line},
                                             {"column", d.column},
                                             {"inMainFile", d.inMainFile}});
    if (d.severity == "error")
      errors.push_back(d.message);
    if (d.message.find("exceeded maximum depth") != std::string::npos ||
        d.message.find("bracket nesting level exceeded maximum") !=
            std::string::npos)
      compilerLimit = true;
    if (d.message.find("file not found") != std::string::npos)
      missingHeader = true;
  }
  if (!frontend.tree) {
    llvm::outs() << llvm::json::Value(llvm::json::Object{
        {"success", false},
        {"errors", std::move(errors)},
        {"diagnostics", std::move(diagnostics)},
        {"frontend",
         llvm::json::Object{{"name", "clang"},
                            {"status", missingHeader   ? "missing_dependency"
                                       : compilerLimit ? "resource_limit"
                                                       : "invalid_cpp"}}}});
    return 0;
  }
  root = frontend.tree;
  optiscope::Analysis analysis(root, true);
  analysis.run();
  analysis.warnings.push_back(
      "Clang C++17 parsing succeeded. Complexity coverage is separate: opaque "
      "effects, unresolved/dependent calls, recursion and while/do termination "
      "remain Unknown. Structural estimates are conditional upper bounds, not "
      "algorithm proofs.");
  analysis.warnings.push_back(
      "Single-threaded profiling only; macro-boundary and constexpr loops are "
      "skipped. Headers and template instantiations are not duplicated in "
      "source regions.");
  std::ifstream input(argv[1], std::ios::binary);
  std::string source((std::istreambuf_iterator<char>(input)), {});
  std::ofstream out(argv[2]);
  out << optiscope::instrument(source, analysis);
  if (!out)
    return 2;
  std::ostringstream serialized;
  optiscope::serialize(analysis, serialized);
  auto json = llvm::json::parse(serialized.str());
  if (!json)
    return 2;
  auto &object = *json->getAsObject();
  object["diagnostics"] = std::move(diagnostics);
  object["frontend"] = llvm::json::Object{{"name", "clang"},
                                          {"version", "14"},
                                          {"status", "parsed"},
                                          {"irVersion", 1}};
  llvm::json::Array limitations;
  for (auto &reason : frontend.runtimeLimitations)
    limitations.push_back(reason);
  object["profilingUnsupportedReasons"] = std::move(limitations);
  int forLoops = 0, rangeLoops = 0, whileLoops = 0, doLoops = 0;
  for (const auto &region : analysis.regions) {
    if (region.node->kind == Kind::ForStmt)
      forLoops++;
    if (region.node->kind == Kind::RangeForStmt)
      rangeLoops++;
    if (region.node->kind == Kind::WhileStmt)
      whileLoops++;
    if (region.node->kind == Kind::DoStmt)
      doLoops++;
  }
  auto &summary = *object["summary"].getAsObject();
  summary["forLoops"] = forLoops;
  summary["rangeForLoops"] = rangeLoops;
  summary["whileLoops"] = whileLoops;
  summary["doLoops"] = doLoops;
  auto &regions = *object["regions"].getAsArray();
  for (size_t i = 0; i < analysis.regions.size(); i++) {
    auto &r = *regions[i].getAsObject();
    auto &region = analysis.regions[i];
    bool conditional = false;
    optiscope::walk(region.node, [&](N n) {
      if (n->kind == Kind::IfStmt || n->kind == Kind::BreakStmt ||
          n->kind == Kind::ReturnStmt || n->libraryCall)
        conditional = true;
    });
    r["complexityConfidence"] = region.cost.unknown ? "unknown"
                                : conditional       ? "estimated"
                                                    : "exact_pattern";
    r["instrumentation"] =
        llvm::json::Object{{"supported", region.node->safeInstrumentation},
                           {"reason", region.node->instrumentationReason}};
  }
  object["summary"].getAsObject()->operator[]("complexityConfidence") =
      analysis.overall.unknown ? "unknown" : "estimated";
  llvm::json::Array functions;
  for (auto function : root->children) {
    auto estimate = optiscope::inferRecurrence(function);
    if (estimate.recursiveCalls)
      functions.push_back(llvm::json::Object{
          {"functionName", optiscope::name(function)},
          {"startLine", function->loc.begin.line},
          {"recursiveCalls", estimate.recursiveCalls},
          {"estimatedComplexity", optiscope::show(estimate.cost)},
          {"confidence", estimate.cost.unknown ? "unknown" : "estimated"},
          {"reason", estimate.reason}});
  }
  object["recurrences"] = std::move(functions);
  llvm::json::Array operations;
  optiscope::walk(root, [&](N n) {
    if (n->kind == Kind::CallExpr && n->libraryCall) {
      auto cost = optiscope::libraryCost(n);
      operations.push_back(llvm::json::Object{
          {"name", n->operation},
          {"containerType", n->receiverType},
          {"startLine", n->loc.begin.line},
          {"estimatedComplexity", optiscope::show(cost.cost)},
          {"confidence", cost.recognized ? "estimated" : "unknown"},
          {"reason", cost.explanation}});
    }
  });
  object["operations"] = std::move(operations);
  llvm::outs() << *json;
}
