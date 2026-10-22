import { Link } from "react-router-dom";
import { ArrowUpRight, Braces, GitBranch, Timer, ScanLine } from "lucide-react";
const modes = [
  ["01", "Auto", "The familiar parser first. Clang when needed."],
  ["02", "Clang", "Semantic C++17 parsing. Built for real programs."],
  ["03", "Legacy", "The academic Flex/Bison pipeline. Works offline."],
];
export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="square-dot" /> THE C++ PERFORMANCE WORKBENCH
          </span>
          <h1>
            Less guessing.
            <br />
            <span>More insight.</span>
          </h1>
          <p>Follow your C++ from source to structure to measured hotspots.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/analyze">
              Begin analysis <ArrowUpRight size={17} />
            </Link>
            <Link className="button secondary" to="/samples">
              Explore samples
            </Link>
          </div>
          <div className="hero-note">
            <span>C++17</span>
            <span>REAL MEASUREMENTS</span>
            <span>LOCAL BY DESIGN</span>
          </div>
        </div>
        <div
          className="hero-desktop"
          aria-label="The OptiScope analysis pipeline"
        >
          <div className="desktop-label">WORKSPACE / OVERVIEW</div>
          <div className="demo-window">
            <div className="window-bar">
              <span>
                <Braces size={14} /> source.cpp
              </span>
              <span aria-hidden="true">─ □ ×</span>
            </div>
            <div className="demo-code">
              <span>01</span>
              <code>for (int i = 0; i &lt; n; ++i) {"{"}</code>
              <span>02</span>
              <code> inspect(data[i]);</code>
              <span>03</span>
              <code>{"}"}</code>
            </div>
            <div className="demo-caption">ILLUSTRATIVE SOURCE</div>
          </div>
          <div className="pipeline-arrow">↓</div>
          <div className="mini-windows">
            <div className="mini-window">
              <div className="mini-title">
                <GitBranch size={15} /> STRUCTURE
              </div>
              <div className="tree-preview">
                <span>⌘ Program</span>
                <span>└ Function</span>
                <span>　└ Loop region</span>
              </div>
            </div>
            <div className="mini-window">
              <div className="mini-title">
                <Timer size={15} /> MEASURE
              </div>
              <div className="measure-preview">
                <ScanLine size={29} />
                <span>
                  Compile → Execute
                  <br />
                  Rank → Inspect
                </span>
              </div>
            </div>
          </div>
          <div className="desktop-footer">
            <span className="square-dot" /> STRUCTURE + RUNTIME, TOGETHER.
          </div>
        </div>
      </section>
      <section className="home-modes">
        <div className="section-label">
          <h2>THREE WAYS IN. ONE WORKSPACE.</h2>
          <Link to="/about">How it works ↗</Link>
        </div>
        <div className="mode-grid">
          {modes.map(([id, title, text]) => (
            <Link to="/analyze" className="mode-card" key={id}>
              <span className="mode-number">{id}</span>
              <h3>
                {title}
                <ArrowUpRight size={18} />
              </h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </section>
      <div className="workflow-ribbon">
        {[
          "SOURCE",
          "PARSE",
          "TYPED IR",
          "COMPLEXITY",
          "PROFILE",
          "HOTSPOTS",
        ].map((label, i) => (
          <span key={label}>
            <b>{String(i + 1).padStart(2, "0")}</b>
            {label}
            {i < 5 && <span aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
    </>
  );
}
