import { LoaderCircle } from "lucide-react";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
export default function WorkspaceStatus() {
  const { analysis: a } = useWorkspace();
  return (
    <>
      {a.busy && (
        <div className="progress-message" role="status">
          <LoaderCircle className="spin" size={16} />
          {
            {
              profile: "Compiling & profiling in Docker…",
              analyze: "Parsing & analyzing…",
              sample: "Loading source…",
              file: "Reading source…",
            }[a.busy]
          }
        </div>
      )}
      {a.error && (
        <div className="notice error" role="alert">
          {a.error}
        </div>
      )}
      {!!a.result?.errors?.length && (
        <div className="notice error" role="alert">
          <div>
            <strong>
              {a.result.success
                ? "Profiling did not complete"
                : "Analysis did not complete"}
            </strong>
            {a.result.errors.map((error, i) => (
              <pre key={i}>{error}</pre>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
