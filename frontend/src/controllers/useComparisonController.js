import { useState } from "react";
import { readSourceFile } from "../models/sourceModel.js";
import { comparisonResponse } from "../models/comparisonModel.js";
import { compareSources } from "../services/apiClient.js";
export function useComparisonController() {
  const [files, setFiles] = useState({ original: null, optimized: null });
  const [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function selectFile(role, file) {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      await readSourceFile(file);
      setFiles((previous) => ({ ...previous, [role]: file }));
    } catch (error) {
      setFiles((previous) => ({ ...previous, [role]: null }));
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        comparisonResponse(
          await compareSources(files.original, files.optimized),
        ),
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return { files, result, error, busy, selectFile, compare };
}
