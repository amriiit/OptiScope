#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;
int fibMemo(int n,vector<int>& memo){if(n<2)return n;if(memo[n]!=-1)return memo[n];return memo[n]=fibMemo(n-1,memo)+fibMemo(n-2,memo);}
int fibTable(int n){vector<int> dp(n+2);dp[1]=1;for(int i=2;i<=n;i++)dp[i]=dp[i-1]+dp[i-2];return dp[n];}
int lcs(const string&a,const string&b){int n=a.size(),m=b.size();vector<vector<int>>dp(n+1,vector<int>(m+1));for(int i=1;i<=n;i++)for(int j=1;j<=m;j++)dp[i][j]=a[i-1]==b[j-1]?dp[i-1][j-1]+1:max(dp[i-1][j],dp[i][j-1]);return dp[n][m];}
int grid(int n,int m){vector<vector<int>>dp(n,vector<int>(m,1));for(int i=1;i<n;i++)for(int j=1;j<m;j++)dp[i][j]=dp[i-1][j]+dp[i][j-1];return dp[n-1][m-1];}
int knapsack(){vector<int>w={2,3,4},v={3,4,5};int dp[6]={};for(int i=0;i<3;i++)for(int cap=5;cap>=w[i];cap--)dp[cap]=max(dp[cap],dp[cap-w[i]]+v[i]);return dp[5];}
int main(){vector<int>memo(11,-1);cout<<fibMemo(10,memo)<<" "<<fibTable(10)<<" "<<lcs("abcde","ace")<<" "<<grid(3,3)<<" "<<knapsack()<<"\n";}
