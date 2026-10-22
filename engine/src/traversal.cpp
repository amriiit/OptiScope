#include "traversal.hpp"
namespace optiscope {
std::string name(N n) {
  auto p = n->text.find(' ');
  auto value = p == std::string::npos ? n->text : n->text.substr(p + 1);
  if (value.size() > 2 && value.substr(value.size() - 2) == "[]")
    value.resize(value.size() - 2);
  return value;
}
void walk(N n, const std::function<void(N)> &f) {
  if (!n)
    return;
  f(n);
  for (auto c : n->children)
    walk(c, f);
}
std::set<std::string> ids(N n) {
  std::set<std::string> r;
  walk(n, [&](N x) {
    if (x->kind == K::Identifier)
      r.insert(x->text);
  });
  return r;
}
std::set<std::string> writes(N n) {
  std::set<std::string> r;
  walk(n, [&](N x) {
    if (x->kind == K::VarDecl)
      r.insert(name(x));
    if ((x->kind == K::Assignment ||
         (x->kind == K::UnaryExpr && x->text.find("++") != std::string::npos) ||
         (x->kind == K::UnaryExpr &&
          x->text.find("--") != std::string::npos)) &&
        !x->children.empty()) {
      auto t = x->children[0];
      while (t->kind == K::ArrayAccess)
        t = t->children[0];
      if (t->kind == K::Identifier)
        r.insert(t->text);
    }
  });
  return r;
}
bool pureExpr(N n) {
  if (n->kind != K::Literal && n->kind != K::Identifier &&
      n->kind != K::BinaryExpr && n->kind != K::UnaryExpr)
    return false;
  if (n->text.find("++") != std::string::npos ||
      n->text.find("--") != std::string::npos)
    return false;
  for (auto c : n->children)
    if (!pureExpr(c))
      return false;
  return true;
}
} // namespace optiscope
