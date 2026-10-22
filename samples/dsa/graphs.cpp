#include <iostream>
#include <vector>
#include <queue>
#include <functional>
#include <utility>
using namespace std;
int bfs(const vector<vector<int>>& g){vector<int> seen(g.size());queue<int>q;q.push(0);seen[0]=1;int count=0;while(!q.empty()){auto u=q.front();q.pop();count++;for(int v:g[u])if(!seen[v]){seen[v]=1;q.push(v);}}return count;}
void dfs(int u,const vector<vector<int>>& g,vector<int>& seen){seen[u]=1;for(int v:g[u])if(!seen[v])dfs(v,g,seen);}
vector<int> topo(const vector<vector<int>>& g){vector<int>degree(g.size()),order;for(auto& edges:g)for(int v:edges)degree[v]++;queue<int>q;for(int i=0;i<(int)g.size();i++)if(!degree[i])q.push(i);while(!q.empty()){int u=q.front();q.pop();order.push_back(u);for(int v:g[u])if(--degree[v]==0)q.push(v);}return order;}
int dijkstra(){vector<vector<pair<int,int>>>g(3);g[0]={{1,4},{2,10}};g[1]={{2,2}};vector<int>d(3,1000000);priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>>pq;d[0]=0;pq.push({0,0});while(!pq.empty()){auto [distance,u]=pq.top();pq.pop();if(distance!=d[u])continue;for(auto [v,w]:g[u])if(distance+w<d[v]){d[v]=distance+w;pq.push({d[v],v});}}return d[2];}
int main(){vector<vector<int>>g={{1,2},{3},{3},{}};vector<int>seen(4);dfs(0,g,seen);cout<<bfs(g)<<" "<<topo(g).size()<<" "<<dijkstra()<<" "<<seen[3]<<"\n";}
