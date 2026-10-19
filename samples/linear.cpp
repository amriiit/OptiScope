#include <cstdio>
int main() {
    int n = 800000;
    double sum = 0;
    for (int i = 0; i < n; i++) {
        sum += i % 97;
    }
    printf("linear: %.0f\n", sum);
    return 0;
}
