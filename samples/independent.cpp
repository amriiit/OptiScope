#include <cstdio>
int main() {
  int width = 4096;
  int value = 0;
  for (int row = 0; row < width; row += 2) {
    for (int stride = 1; stride < width; stride *= 2) {
      value += (row + stride) % 17;
    }
  }
  printf("independent: %d\n", value);
  return 0;
}
