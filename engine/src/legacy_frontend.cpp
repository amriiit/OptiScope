#include "frontend.hpp"
#include "parser.hpp"
extern FILE *yyin;
namespace optiscope {
FrontendResult parseLegacy(const std::string &file) {
  FrontendResult result;
  yyin = fopen(file.c_str(), "rb");
  if (!yyin) {
    parseErrors.push_back("Cannot open parser input");
    return result;
  }
  opti::Parser parser;
  const int status = parser.parse();
  fclose(yyin);
  if (!status && parseErrors.empty())
    result.tree = root;
  return result;
}
} // namespace optiscope
