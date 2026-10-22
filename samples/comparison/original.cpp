#include <cstdio>
int main() {
  int values[2000];
  for (int i = 0; i < 2000; i++) { values[i] = i; }
  int hits = 0;
  for (int query = 0; query < 40000; query++) {
    int needle = query % 2400;
    for (int j = 0; j < 2000; j++) {
      if (values[j] == needle) { hits += 1; }
    }
  }
  printf("hits: %d\n", hits);
  return 0;
}
