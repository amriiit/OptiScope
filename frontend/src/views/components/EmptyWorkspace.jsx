import { Link } from "react-router-dom";
import { FileSearch } from "lucide-react";
export default function EmptyWorkspace({ title = "No analysis yet" }) {
  return (
    <section className="panel empty empty-workspace">
      <FileSearch size={40} />
      <h2>{title}</h2>
      <p>Upload a C++ file or open a sample to begin.</p>
      <Link className="button primary" to="/analyze">
        Open analyzer →
      </Link>
    </section>
  );
}
