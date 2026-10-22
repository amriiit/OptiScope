#pragma once
#include "regions.hpp"
namespace optiscope {
std::string instrument(std::string source, const Analysis &analysis);
const char *profilerRuntime();
} // namespace optiscope
