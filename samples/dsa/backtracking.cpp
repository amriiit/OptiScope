#include <iostream>
#include <vector>
using namespace std;
int subsets(int index,int n){if(index==n)return 1;return subsets(index+1,n)+subsets(index+1,n);}
int permutations(vector<int>& a,int index){if(index==(int)a.size())return 1;int count=0;for(int i=index;i<(int)a.size();i++){swap(a[index],a[i]);count+=permutations(a,index+1);swap(a[index],a[i]);}return count;}
long long factorial(int n){return n<2?1:n*factorial(n-1);}
int main(){vector<int>a={1,2,3};cout<<subsets(0,4)<<" "<<permutations(a,0)<<" "<<factorial(6)<<"\n";}
