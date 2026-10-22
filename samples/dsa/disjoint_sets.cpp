#include <iostream>
#include <vector>
#include <numeric>
using namespace std;
class DSU{vector<int>parent,rank;public:explicit DSU(int n):parent(n),rank(n){iota(parent.begin(),parent.end(),0);}int find(int x){return parent[x]==x?x:parent[x]=find(parent[x]);}void unite(int a,int b){a=find(a);b=find(b);if(a==b)return;if(rank[a]<rank[b])swap(a,b);parent[b]=a;if(rank[a]==rank[b])rank[a]++;}};
int main(){DSU d(5);d.unite(0,1);d.unite(1,3);cout<<(d.find(0)==d.find(3))<<" "<<(d.find(0)==d.find(4))<<"\n";}
