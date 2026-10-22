#include <cstdio>
int main() {
  int n = 28;
  int sum = 0;
  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
      for (int k = 0; k < n; k++) {
        sum += (i + j + k) % 11;
      }
    }
  }
  printf("triple: %d\n", sum);
  return 0;
}
