#include "ast.hpp"
#include "frontend.hpp"
#include "instrumenter.hpp"
#include "regions.hpp"
#include "serialization.hpp"
#include <fstream>
N root;
std::vector<std::string> parseErrors;
int main(int argc, char **argv) {
  if (argc < 2) {
    std::cerr << "Usage: optiscope source.cpp [instrumented.cpp]\n";
    return 2;
  }
  std::ifstream in(argv[1], std::ios::binary);
  if (!in) {
    std::cerr << "Cannot read input";
    return 2;
  }
  std::string source((std::istreambuf_iterator<char>(in)), {});
  auto parsed = optiscope::parseLegacy(argv[1]);
  if (!parsed.tree) {
    std::cout << "{\"success\":false,\"errors\":"
              << optiscope::strings(parseErrors) << "}";
    return 0;
  }
  optiscope::Analysis analysis(root);
  analysis.run();
  if (argc > 2) {
    std::ofstream out(argv[2]);
    out << optiscope::instrument(source, analysis);
    if (!out) {
      std::cerr << "Cannot write instrumented source";
      return 2;
    }
  }
  optiscope::serialize(analysis, std::cout);
}
