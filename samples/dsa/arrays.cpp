#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
int linearSearch(const vector<int>& a,int key){for(int i=0;i<(int)a.size();i++)if(a[i]==key)return i;return -1;}
vector<int> prefixSum(const vector<int>& a){vector<int> p(a.size()+1);for(size_t i=0;i<a.size();i++)p[i+1]=p[i]+a[i];return p;}
int kadane(const vector<int>& a){int best=a[0],ending=a[0];for(size_t i=1;i<a.size();i++){ending=max(a[i],ending+a[i]);best=max(best,ending);}return best;}
int main(){vector<int>a={-2,1,-3,4,-1,2,1,-5,4};cout<<linearSearch(a,4)<<" "<<prefixSum(a).back()<<" "<<kadane(a)<<"\n";}
