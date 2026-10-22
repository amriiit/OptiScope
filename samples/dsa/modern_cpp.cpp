#include <iostream>
#include <vector>
#include <string>
#include <array>
#include <deque>
#include <list>
#include <stack>
#include <queue>
#include <set>
#include <map>
#include <unordered_set>
#include <unordered_map>
#include <tuple>
#include <bitset>
#include <chrono>
#include <algorithm>
#include <numeric>
using namespace std;
using namespace chrono;
using Matrix=vector<vector<int>>;
typedef unsigned long long Size;
constexpr int square(int n){return n*n;}
template<class T> T sum(const vector<T>& values){T total{};for(const auto& v:values)total+=v;return total;}
namespace demo{struct Counter{int value;explicit Counter(int n=0):value(n){}int add(int n){return value+=n;}};}
int overloaded(int x){return x+1;}double overloaded(double x){return x+0.5;}
int main(){const vector<int> values={3,1,2};Matrix dp(2,vector<int>(3,-1));array<int,2>a={1,2};deque<int>d={2};list<int>l={3};stack<int>s;queue<pair<int,int>>q;priority_queue<pair<int,int>,vector<pair<int,int>>,greater<pair<int,int>>>pq;set<int>ss={1};multiset<int>ms={1,1};map<int,int>m={{1,2}};multimap<int,int>mm={{1,2},{1,3}};unordered_set<int>us={1};unordered_map<int,int>um={{1,2}};tuple<int,string>t={7,"ok"};bitset<8>b(3);auto [number,text]=t;int saved=number;auto f=[&,saved](int x){return x+saved+values[0];};demo::Counter c;volatile Size check=square(3);int total=0;for(const auto& [key,value]:m)total+=key+value;int i=0;do{++i;}while(i<2);switch(i){case 2:total+=1;break;default:total=0;}for(int j=0;j<5;j++){if(j==1)continue;if(j==3)break;total+=j;}s.push(1);q.push({1,2});pq.push({3,4});cout<<sum(values)<<" "<<f(1)<<" "<<total<<" "<<number<<" "<<text<<" "<<c.add(2)<<" "<<check<<"\n";}
