import path from "node:path";
export function sourceUpload(file) {
  if (!file || !/\.cpp$/i.test(file.originalname))
    throw new Error(
      'Upload one .cpp file in multipart field "file" (maximum 128 KiB).',
    );
  if (!file.size || file.buffer.includes(0))
    throw new Error("Source must be nonempty UTF-8 text without NUL bytes.");
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } catch {
    throw new Error("Source must be valid UTF-8.");
  }
  return { fileName: path.basename(file.originalname), source };
}
