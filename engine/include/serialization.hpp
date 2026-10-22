#pragma once
#include "regions.hpp"
namespace optiscope {
std::string strings(const std::vector<std::string> &values);
void serialize(const Analysis &analysis, std::ostream &out);
} // namespace optiscope
