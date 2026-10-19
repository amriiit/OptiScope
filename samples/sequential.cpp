#include <cstdio>
int main() {
    int n = 700000;
    double sum = 0;
    for (int i = 0; i < n; i++) {
        sum += i % 71;
    }
    for (int j = 0; j < n; j++) {
        sum += j % 97;
    }
    printf("sequential: %.0f\n", sum);
    return 0;
}
