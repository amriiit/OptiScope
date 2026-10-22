import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { initiallyExpanded, regionPath } from "./regionPresentation";
function Node({ node, onSelect, selectedId, selectedPath }) {
  const onSelectedPath = selectedPath.has(node);
  const [open, setOpen] = useState(
    () => initiallyExpanded(node) || onSelectedPath,
  );
  const selected = Boolean(node.regionId && node.regionId === selectedId);
  useEffect(() => {
    setOpen(initiallyExpanded(node));
  }, [node]);
  useEffect(() => {
    if (onSelectedPath) setOpen(true);
  }, [onSelectedPath, selectedId, node]);
  const kind = node.regionId
    ? "loop"
    : node.type === "FunctionDecl"
      ? "function"
      : [
            "Block",
            "VarDecl",
            "IfStmt",
            "ReturnStmt",
            "Assignment",
            "ExprStmt",
          ].includes(node.type)
        ? "statement"
        : "";
  const label = (
    <>
      <span className={`ast-kind ${kind}`}>{node.type}</span>
      {node.text && <code>{node.text.slice(0, 110)}</code>}
      <span className="ast-location">
        L{node.startLine}
        {node.endLine !== node.startLine && `–${node.endLine}`}
        {node.regionId && ` · ${node.regionId}`}
      </span>
      {node.regionId && (
        <button
          className="text-button"
          onClick={(e) => {
            e.preventDefault();
            onSelect(node.regionId);
          }}
        >
          Locate
        </button>
      )}
    </>
  );
  return node.children?.length ? (
    <details
      open={open}
      className="ast-node"
      data-region-id={node.regionId || undefined}
      onToggle={(e) => {
        if (e.target === e.currentTarget) setOpen(e.currentTarget.open);
      }}
    >
      <summary
        className={selected ? "ast-selected" : ""}
        aria-current={selected ? "true" : undefined}
      >
        {label}
      </summary>
      <div className="ast-children">
        {node.children.map((n, i) => (
          <Node
            key={i}
            node={n}
            onSelect={onSelect}
            selectedId={selectedId}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    </details>
  ) : (
    <div className={`ast-leaf ${selected ? "ast-selected" : ""}`}>{label}</div>
  );
}
export default function AstTree({ ast, onSelect, selectedId, frontend }) {
  const selectedPath = useMemo(
    () => new Set(regionPath(ast, selectedId)),
    [ast, selectedId],
  );
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <GitBranch size={17} />
          <h2>Abstract syntax tree</h2>
        </div>
        <span className="muted text-xs">
          {frontend === "clang"
            ? "Clang → normalized typed IR"
            : "Flex → Bison → typed AST"}
        </span>
      </div>
      <div className="ast-legend">
        <span className="ast-kind function">Function</span>
        <span className="ast-kind loop">Loop</span>
        <span className="ast-kind statement">Statement</span>
        <span>Expand a loop to inspect its body.</span>
      </div>
      <div className="ast-scroll">
        {ast ? (
          <Node
            node={ast}
            onSelect={onSelect}
            selectedId={selectedId}
            selectedPath={selectedPath}
          />
        ) : (
          <div className="empty">
            <p>Analyze source to explore the real parser output.</p>
          </div>
        )}
      </div>
    </section>
  );
}
