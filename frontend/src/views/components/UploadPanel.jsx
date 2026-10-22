import { Upload, FileCode2 } from "lucide-react";
export default function UploadPanel({
  source,
  fileName,
  busy,
  drag,
  setDrag,
  setError,
  openFile,
  samples,
  sample,
  setSample,
  loadSample,
}) {
  return (
    <section className="panel upload-panel">
      <div
        className={`drop-zone ${drag ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) {
            if (e.dataTransfer.files.length !== 1)
              setError("Upload one file at a time.");
            else openFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <label className={`upload-label ${busy ? "disabled" : ""}`}>
          <span className="upload-icon">
            <Upload size={20} />
          </span>
          <span>
            <strong>{fileName || "Drop your C++ source here"}</strong>
            <small>
              {fileName
                ? `${new TextEncoder().encode(source).length.toLocaleString()} bytes · Ready for analysis`
                : "or click to browse · single .cpp · up to 128 KiB"}
            </small>
          </span>
          <input
            type="file"
            accept=".cpp"
            disabled={!!busy}
            aria-label="Upload C++ file"
            onChange={(e) => {
              openFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="sample-controls">
        <span className="muted text-xs">TRY AN EXAMPLE</span>
        <div>
          <select
            aria-label="Sample program"
            value={sample}
            disabled={!!busy}
            onChange={(e) => setSample(e.target.value)}
          >
            {samples.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={loadSample}
          >
            <FileCode2 size={15} />
            Load Sample
          </button>
        </div>
      </div>
    </section>
  );
}
