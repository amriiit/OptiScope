import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, FileCode2 } from "lucide-react";
import { getCorpus } from "../../services/apiClient.js";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
import PageHeading from "../components/PageHeading.jsx";
export default function Samples() {
  const { analysis: a } = useWorkspace();
  const [corpus, setCorpus] = useState([]),
    [category, setCategory] = useState("All"),
    [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    getCorpus()
      .then((items) => {
        if (active) setCorpus(items);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const academic = a.samples.map((name) => ({
    name,
    title: name.replace(".cpp", "").replaceAll("_", " "),
    category: "Academic",
    frontend: "auto",
  }));
  const items = [...academic, ...corpus].filter(
    (item) => category === "All" || item.category === category,
  );
  async function launch(item) {
    setError("");
    const loaded = await a.loadExample(
      item.name,
      item.category !== "Academic",
      item.frontend,
    );
    if (loaded) navigate("/analyze");
  }
  return (
    <>
      <PageHeading number="04" title="Sample library">
        <span>Small patterns. Real algorithms. Ready to inspect.</span>
      </PageHeading>
      <div className="library-toolbar">
        <div className="filter-tabs" role="group" aria-label="Sample category">
          {["All", "Academic", "DSA", "Modern C++", "Stress"].map((label) => (
            <button
              key={label}
              aria-pressed={category === label}
              onClick={() => setCategory(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="mono muted">{items.length} FILES</span>
      </div>
      {(error || a.error) && (
        <div className="notice error" role="alert">
          {error || a.error}
        </div>
      )}
      <div className="sample-grid">
        {items.map((item) => (
          <article className="sample-card" key={item.name}>
            <div className="sample-card-top">
              <FileCode2 size={25} />
              <span className="badge">{item.category}</span>
            </div>
            <h2>{item.title}</h2>
            <code>{item.name}</code>
            <div className="sample-card-bottom">
              <span>
                {item.frontend === "clang"
                  ? "CLANG / C++17"
                  : "AUTO / FLEX + BISON"}
              </span>
              <button
                aria-label={`Open ${item.name}`}
                className="text-button"
                disabled={!!a.busy}
                onClick={() => launch(item)}
              >
                Open <ArrowUpRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="empty" role="status">
          {category === "All"
            ? "Loading sample library…"
            : "No samples loaded in this category."}
        </div>
      )}
    </>
  );
}
