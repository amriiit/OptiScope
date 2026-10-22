export const MAX_FILE_SIZE = 128 * 1024;
export async function readSourceFile(file) {
  if (!/\.cpp$/i.test(file.name))
    throw new Error("Select a single .cpp source file.");
  if (!file.size || file.size > MAX_FILE_SIZE)
    throw new Error("File must be nonempty and no larger than 128 KiB.");
  const bytes = await file.arrayBuffer();
  if (new Uint8Array(bytes).includes(0))
    throw new Error("Source contains NUL bytes.");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
