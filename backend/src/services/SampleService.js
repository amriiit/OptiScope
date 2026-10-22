import path from "node:path";
import { readFile } from "node:fs/promises";
import { rootDir } from "../config/limits.js";
export const sampleNames = [
  "linear.cpp",
  "nested.cpp",
  "sequential.cpp",
  "logarithmic.cpp",
  "mixed_hotspots.cpp",
  "patterns.cpp",
  "triple.cpp",
  "independent.cpp",
];
export async function readSample(name) {
  if (!sampleNames.includes(name)) return null;
  return {
    fileName: name,
    source: await readFile(path.join(rootDir, "samples", name), "utf8"),
  };
}

// Explicit allowlist: caller input never becomes an unchecked filesystem path.
export const corpus = [
  ["arrays", "Arrays & prefix sums", "DSA"],
  ["sort_search", "Sorting & binary search", "DSA"],
  ["strings_two_pointers", "Strings & two pointers", "DSA"],
  ["linked_list", "Linked lists", "DSA"],
  ["stacks_queues", "Stacks & queues", "DSA"],
  ["trees_bst", "Trees & BST", "DSA"],
  ["graphs", "Graph algorithms", "DSA"],
  ["disjoint_sets", "Disjoint sets", "DSA"],
  ["dynamic_programming", "Dynamic programming", "DSA"],
  ["backtracking", "Backtracking & recursion", "DSA"],
  ["modern_cpp", "Modern C++ syntax", "Modern C++"],
  ["stress", "18-benchmark stress program", "Stress"],
].map(([name, title, category]) => ({
  name: `${name}.cpp`,
  title,
  category,
  frontend: "clang",
}));
export async function readCorpusSample(name) {
  if (!corpus.some((item) => item.name === name)) return null;
  return {
    fileName: name,
    source: await readFile(path.join(rootDir, "samples", "dsa", name), "utf8"),
  };
}
