import { useEffect, useState } from "react";
import * as api from "../services/apiClient.js";
import { analysisResponse } from "../models/analysisModel.js";
import { readSourceFile } from "../models/sourceModel.js";
export function useAnalysisController() {
  const [frontend, setFrontend] = useState("auto");
  const [diagnosticSelection, setDiagnosticSelection] = useState(null);
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [samples, setSamples] = useState([]);
  const [sample, setSample] = useState("nested.cpp");
  const [health, setHealth] = useState(null);
  const [selectedId, updateSelectedId] = useState(null);
  const [drag, setDrag] = useState(false);
  async function checkHealth() {
    try {
      setHealth(await api.getHealth());
    } catch {
      setHealth({
        docker: {
          available: false,
          reason: "API is unreachable. Start the backend on port 3001.",
        },
      });
    }
  }
  useEffect(() => {
    checkHealth();
    api
      .getSamples()
      .then(setSamples)
      .catch(() =>
        setError("Cannot reach the API. Start the backend and refresh."),
      );
  }, []);
  function setSelectedId(id) {
    setDiagnosticSelection(null);
    updateSelectedId(id);
  }
  function changeFrontend(value) {
    setFrontend(value);
    setError("");
    setResult(null);
    setSelectedId(null);
  }
  function selectDiagnostic(diagnostic) {
    updateSelectedId(null);
    setDiagnosticSelection({
      id: `diagnostic-${diagnostic.startLine}`,
      startLine: diagnostic.startLine,
      endLine: diagnostic.startLine,
      estimatedComplexity: "Compiler diagnostic",
    });
  }
  const selected = result?.regions.find((r) => r.id === selectedId);
  function load(text, name) {
    setSource(text);
    setFileName(name);
    setResult(null);
    setSelectedId(null);
    setError("");
  }
  async function openFile(file) {
    if (!file) return;
    setBusy("file");
    try {
      load(await readSourceFile(file), file.name);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy("");
    }
  }

  async function loadSample() {
    return loadExample(sample);
  }
  async function loadExample(name, corpus = false, mode) {
    setBusy("sample");
    setError("");
    try {
      const data = await (corpus
        ? api.getCorpusSample(name)
        : api.getSample(name));
      load(data.source, data.fileName);
      if (mode) setFrontend(mode);
      return true;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function run(operation) {
    setBusy(operation);
    setError("");
    try {
      const data = analysisResponse(
        await api.analyzeSource(source, fileName, operation, frontend),
      );
      setResult(data);
      setSelectedId(data.hotspots?.[0]?.id || data.regions?.[0]?.id || null);
      return data;
    } catch (e) {
      setError(`Request failed: ${e.message}`);
    } finally {
      setBusy("");
      checkHealth();
    }
  }
  return {
    frontend,
    changeFrontend,
    diagnosticSelection,
    selectDiagnostic,
    source,
    fileName,
    result,
    busy,
    error,
    samples,
    sample,
    setSample,
    health,
    selectedId,
    setSelectedId,
    drag,
    setDrag,
    selected,
    checkHealth,
    openFile,
    loadSample,
    loadExample,
    run,
    setError,
  };
}
