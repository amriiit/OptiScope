#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;
void bubble(vector<int>& a){int n=a.size();for(int i=0;i<n;i++)for(int j=0;j<n-1;j++)if(a[j]>a[j+1])swap(a[j],a[j+1]);}
void mergeSort(vector<int>& a,int l,int r){if(r-l<2)return;int m=(l+r)/2;mergeSort(a,l,m);mergeSort(a,m,r);inplace_merge(a.begin()+l,a.begin()+m,a.begin()+r);}
int binary(const vector<int>& a,int key){int l=0,r=a.size();while(l<r){int m=l+(r-l)/2;if(a[m]<key)l=m+1;else r=m;}return l;}
int main(){vector<int>a={5,1,4,2,3},b=a,c=a;bubble(a);mergeSort(b,0,b.size());sort(c.begin(),c.end());cout<<(a==b&&b==c)<<" "<<binary(c,4)<<" "<<binary_search(c.begin(),c.end(),3)<<"\n";}
