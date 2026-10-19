#include <cstdio>
int main() {
    int n = 1000000;
    double sum = 0;
    for (int i = 1; i < n; i *= 2) {
        sum += i;
    }
    for (int j = n; j > 1; j /= 2) {
        sum += j;
    }
    printf("logarithmic: %.0f\n", sum);
    return 0;
}
