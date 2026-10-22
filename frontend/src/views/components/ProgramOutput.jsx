import { Terminal } from "lucide-react";
export default function ProgramOutput({ execution }) {
  return (
    <section className="panel output-panel">
      <div className="panel-head">
        <div>
          <Terminal size={17} />
          <h2>Program output</h2>
        </div>
        <span className="badge">EXIT {execution.exitCode}</span>
      </div>
      <pre>
        {execution.stdout || "(no stdout)"}
        {execution.stderr ? `\nSTDERR\n${execution.stderr}` : ""}
      </pre>
    </section>
  );
}
