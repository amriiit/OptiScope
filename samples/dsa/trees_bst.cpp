#include <iostream>
struct Tree {int value;Tree* left=nullptr;Tree* right=nullptr;explicit Tree(int value):value(value){};};
int dfs(const Tree* n){return n?n->value+dfs(n->left)+dfs(n->right):0;}
Tree* insert(Tree* n,int value){if(!n)return new Tree(value);if(value<n->value)n->left=insert(n->left,value);else n->right=insert(n->right,value);return n;}
bool search(const Tree* n,int key){while(n){if(n->value==key)return true;n=key<n->value?n->left:n->right;}return false;}
void destroy(Tree* n){if(!n)return;destroy(n->left);destroy(n->right);delete n;}
int main(){Tree* root=nullptr;for(int x:{4,2,7,1,3})root=insert(root,x);std::cout<<dfs(root)<<" "<<search(root,3)<<" "<<search(root,9)<<"\n";destroy(root);}
