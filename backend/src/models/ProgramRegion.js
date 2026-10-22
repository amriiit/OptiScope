// Validate the cross-layer source mapping before admitting engine output.
export function validateRegions(regions) {
  if (!Array.isArray(regions))
    throw new Error("Invalid engine region collection");
  const ids = new Set();
  for (const region of regions) {
    if (!/^R\d+$/.test(region.id) || ids.has(region.id))
      throw new Error("Invalid or duplicate engine region ID");
    ids.add(region.id);
    if (
      ![
        region.startLine,
        region.endLine,
        region.startOffset,
        region.endOffset,
      ].every(Number.isSafeInteger) ||
      region.startLine < 1 ||
      region.endLine < region.startLine ||
      region.startOffset < 0 ||
      region.endOffset <= region.startOffset
    )
      throw new Error("Invalid engine source range");
  }
  return regions;
}
