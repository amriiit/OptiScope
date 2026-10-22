#include <iostream>
#include <stack>
#include <queue>
#include <vector>
using namespace std;
vector<int> nextGreater(const vector<int>& a){vector<int> result(a.size(),-1);stack<int> pending;for(int i=0;i<(int)a.size();i++){while(!pending.empty()&&a[pending.top()]<a[i]){result[pending.top()]=a[i];pending.pop();}pending.push(i);}return result;}
int main(){auto values=nextGreater({2,1,3});queue<int> q;for(int x:values)q.push(x);int sum=0;while(!q.empty()){sum+=q.front();q.pop();}cout<<sum<<"\n";}
