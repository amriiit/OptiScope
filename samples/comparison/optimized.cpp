#include <cstdio>
int main() {
  int frequency[2400];
  for (int i = 0; i < 2400; i++) { frequency[i] = 0; }
  for (int i = 0; i < 2000; i++) { frequency[i] += 1; }
  int hits = 0;
  for (int query = 0; query < 40000; query++) {
    int needle = query % 2400;
    hits += frequency[needle];
  }
  printf("hits: %d\n", hits);
  return 0;
}
