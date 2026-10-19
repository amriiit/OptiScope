#include <cstdio>
int main() {
    int small = 28;
    int large = 2600;
    double sum = 0;
    for (int i = 0; i < small; i++) {
        for (int j = 0; j < small; j++) {
            for (int k = 0; k < small; k++) {
                sum += (i + j + k) % 97;
            }
        }
    }
    for (int a = 0; a < large; a++) {
        for (int b = 0; b < large; b++) {
            sum += (a + b) % 97;
        }
    }
    printf("mixed: %.0f\n", sum);
    return 0;
}
