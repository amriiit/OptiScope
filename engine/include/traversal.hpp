#pragma once
#include "ast.hpp"
#include <algorithm>
#include <functional>
#include <map>
#include <set>
namespace optiscope {
using K = Kind;
std::string name(N n);
void walk(N n, const std::function<void(N)> &f);
std::set<std::string> ids(N n);
std::set<std::string> writes(N n);
bool pureExpr(N n);
} // namespace optiscope
