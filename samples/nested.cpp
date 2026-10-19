#include <cstdio>
int main() {
    int n = 1200;
    double sum = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            sum += (i + j) % 97;
        }
    }
    printf("nested: %.0f\n", sum);
    return 0;
}
