
#include <iostream>
#include <vector>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <numeric>
#include <unordered_map>
#include <unordered_set>
using namespace std;
using namespace chrono;
volatile long long sink = 0;
vector<int> generateData(int n) {
    vector<int> arr;
    for(int i=0;i<n;i++) {
        arr.push_back((i*37+13)%1000);
    }
    return arr;
}
long long linearSum(const vector<int>& arr) {
    long long sum=0;
    for(int i=0;i<(int)arr.size();i++) {
        sum+=arr[i];
    }
    return sum;
}
long long redundantNestedSum(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        for(int j=0;j<n;j++) {
            result+=(arr[i]+arr[j])%17;
        }
    }
    return result;
}
long long tripleNestedComputation(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        for(int j=0;j<n;j++) {
            for(int k=0;k<n;k++) {
                result+=(arr[i]+arr[j]+arr[k])%11;
            }
        }
    }
    return result;
}
long long inefficientDuplicateSearch(const vector<int>& arr) {
    int n=arr.size();
    long long duplicates=0;
    for(int i=0;i<n;i++) {
        for(int j=i+1;j<n;j++) {
            if(arr[i]==arr[j]) {
                duplicates++;
            }
        }
    }
    return duplicates;
}
long long repeatedLinearSearch(const vector<int>& arr) {
    int n=arr.size();
    long long found=0;
    for(int i=0;i<n;i++) {
        int target=(i*23)%1000;
        for(int j=0;j<n;j++) {
            if(arr[j]==target) {
                found++;
                break;
            }
        }
    }
    return found;
}
long long inefficientSorting(vector<int> arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        sort(arr.begin(),arr.end());
        result+=arr[i];
        if(i%2==0) {
            reverse(arr.begin(),arr.end());
        }
    }
    return result;
}
long long loopInvariantWaste(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        for(int j=0;j<n;j++) {
            long long constant=0;
            for(int k=0;k<n;k++) {
                constant+=arr[k];
            }
            result+=(constant+arr[i]+arr[j])%97;
        }
    }
    return result;
}
long long inefficientPrefixSum(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        long long prefix=0;
        for(int j=0;j<=i;j++) {
            prefix+=arr[j];
        }
        result+=prefix;
    }
    return result;
}
long long bubbleSortSimulation(vector<int> arr) {
    int n=arr.size();
    long long swaps=0;
    for(int i=0;i<n;i++) {
        for(int j=0;j<n-i-1;j++) {
            if(arr[j]>arr[j+1]) {
                swap(arr[j],arr[j+1]);
                swaps++;
            }
        }
    }
    return swaps;
}
long long matrixMultiplication(int n) {
    vector<vector<int>> A(n,vector<int>(n,2));
    vector<vector<int>> B(n,vector<int>(n,3));
    vector<vector<long long>> C(n,vector<long long>(n,0));
    long long checksum=0;
    for(int i=0;i<n;i++) {
        for(int j=0;j<n;j++) {
            for(int k=0;k<n;k++) {
                C[i][j]+=A[i][k]*B[k][j];
            }
            checksum+=C[i][j];
        }
    }
    return checksum;
}
long long logarithmicLoop(int n) {
    long long result=0;
    for(int i=1;i<n;i*=2) {
        result+=i;
    }
    return result;
}
long long nLogNLoop(int n) {
    long long result=0;
    for(int i=0;i<n;i++) {
        for(int j=1;j<n;j*=2) {
            result+=(i+j)%13;
        }
    }
    return result;
}
long long repeatedVectorAllocation(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        vector<int> temp;
        for(int j=0;j<n;j++) {
            temp.push_back(arr[j]);
        }
        result+=temp[i];
    }
    return result;
}
long long unnecessaryRecomputation(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        long long total=0;
        for(int j=0;j<n;j++) {
            total+=arr[j]*arr[j];
        }
        result+=total%101;
    }
    return result;
}
long long inefficientFrequencyCount(const vector<int>& arr) {
    int n=arr.size();
    long long result=0;
    for(int i=0;i<n;i++) {
        int frequency=0;
        for(int j=0;j<n;j++) {
            if(arr[i]==arr[j]) {
                frequency++;
            }
        }
        result+=frequency;
    }
    return result;
}
long long optimizedFrequencyCount(const vector<int>& arr) {
    unordered_map<int,int> freq;
    for(int x:arr) {
        freq[x]++;
    }
    long long result=0;
    for(int x:arr) {
        result+=freq[x];
    }
    return result;
}
long long optimizedPrefixSum(const vector<int>& arr) {
    long long prefix=0;
    long long result=0;
    for(int x:arr) {
        prefix+=x;
        result+=prefix;
    }
    return result;
}
long long optimizedDuplicateSearch(const vector<int>& arr) {
    unordered_map<int,long long> freq;
    long long duplicates=0;
    for(int x:arr) {
        duplicates+=freq[x];
        freq[x]++;
    }
    return duplicates;
}
template<typename F>
void benchmark(const string& name,F function) {
    auto start=steady_clock::now();
    long long result=function();
    auto end=steady_clock::now();
    sink=sink^result;
    auto duration=duration_cast<microseconds>(end-start).count();
    cout<<name<<endl;
    cout<<"Result: "<<result<<endl;
    cout<<"Execution Time: "<<duration<<" microseconds"<<endl;
    cout<<"--------------------------------------"<<endl;
}
int main() {
    int n=120;
    vector<int> arr=generateData(n);
    cout<<"======================================"<<endl;
    cout<<"COMPILER PERFORMANCE HOTSPOT TEST"<<endl;
    cout<<"======================================"<<endl;
    cout<<"Input Size: "<<n<<endl;
    cout<<"--------------------------------------"<<endl;
    benchmark("1. Linear Sum O(n)",[&](){
        return linearSum(arr);
    });
    benchmark("2. Nested Sum O(n^2)",[&](){
        return redundantNestedSum(arr);
    });
    benchmark("3. Triple Nested O(n^3)",[&](){
        return tripleNestedComputation(arr);
    });
    benchmark("4. Duplicate Search O(n^2)",[&](){
        return inefficientDuplicateSearch(arr);
    });
    benchmark("5. Repeated Linear Search O(n^2)",[&](){
        return repeatedLinearSearch(arr);
    });
    benchmark("6. Repeated Sorting O(n^2 log n)",[&](){
        return inefficientSorting(arr);
    });
    benchmark("7. Loop Invariant Waste O(n^3)",[&](){
        return loopInvariantWaste(arr);
    });
    benchmark("8. Prefix Sum O(n^2)",[&](){
        return inefficientPrefixSum(arr);
    });
    benchmark("9. Bubble Sort O(n^2)",[&](){
        return bubbleSortSimulation(arr);
    });
    benchmark("10. Matrix Multiplication O(n^3)",[&](){
        return matrixMultiplication(80);
    });
    benchmark("11. Logarithmic Loop O(log n)",[&](){
        return logarithmicLoop(n);
    });
    benchmark("12. N Log N Loop O(n log n)",[&](){
        return nLogNLoop(n);
    });
    benchmark("13. Repeated Allocation O(n^2)",[&](){
        return repeatedVectorAllocation(arr);
    });
    benchmark("14. Unnecessary Recomputation O(n^2)",[&](){
        return unnecessaryRecomputation(arr);
    });
    benchmark("15. Frequency Count O(n^2)",[&](){
        return inefficientFrequencyCount(arr);
    });
    benchmark("16. Optimized Frequency O(n)",[&](){
        return optimizedFrequencyCount(arr);
    });
    benchmark("17. Optimized Prefix O(n)",[&](){
        return optimizedPrefixSum(arr);
    });
    benchmark("18. Optimized Duplicate O(n)",[&](){
        return optimizedDuplicateSearch(arr);
    });
    cout<<"Final checksum: "<<sink<<endl;
    cout<<"All benchmarks completed."<<endl;
    return 0;
}
