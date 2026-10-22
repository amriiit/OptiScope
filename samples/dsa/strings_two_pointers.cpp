#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
using namespace std;
bool palindrome(const string& s){size_t l=0,r=s.size();while(l<r){if(s[l++]!=s[--r])return false;}return true;}
bool pairSum(const vector<int>& a,int target){int l=0,r=(int)a.size()-1;while(l<r){int sum=a[l]+a[r];if(sum==target)return true;if(sum<target)l++;else r--;}return false;}
int window(const vector<int>& a,int k){int sum=0,best=0;for(int i=0;i<(int)a.size();i++){sum+=a[i];if(i>=k)sum-=a[i-k];if(i>=k-1&&sum>best)best=sum;}return best;}
int main(){string s="level";unordered_map<char,int> freq;for(char c:s)freq[c]++;cout<<palindrome(s)<<" "<<freq['l']<<" "<<pairSum({1,2,4,8},6)<<" "<<window({1,3,2,4},2)<<"\n";}
