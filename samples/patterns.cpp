#include <cstdio>
double scale(double x) {
    return x * x + 1;
}
int main() {
    int n = 180;
    int values[180];
    int other[180];
    double factor = 1.5;
    double sum = 0;
    for (int i = 0; i < n; i++) {
        values[i] = i % 23;
        other[i] = i % 17;
    }
    for (int i = 0; i < n; i++) {
        sum += factor * factor;
        sum += scale(factor);
        for (int j = 0; j < n; j++) {
            if (values[i] == other[j]) {
                sum += 1;
            }
            if (values[j] == i) {
                sum += 1;
            }
        }
    }
    printf("patterns: %.0f\n", sum);
    return 0;
}
