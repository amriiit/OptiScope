#pragma once
#include "ast.hpp"
namespace optiscope {
// Both compiler frontends normalize into the typed Node IR. Unknown nodes
// retain their children and source geometry; they never imply constant work.
struct FrontendDiagnostic {
  std::string message, severity, file;
  int line = 0, column = 0;
  bool inMainFile = false;
};
struct FrontendResult {
  std::vector<FrontendDiagnostic> diagnostics;
  N tree;
  std::vector<std::string> warnings;
  std::vector<std::string> runtimeLimitations;
};
FrontendResult parseLegacy(const std::string &file);
FrontendResult parseClang(const std::string &file);
} // namespace optiscope
