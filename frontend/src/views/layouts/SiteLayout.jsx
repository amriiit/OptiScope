import { useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Box, LoaderCircle } from "lucide-react";
import { useWorkspace } from "../../controllers/WorkspaceContext.jsx";
const links = [
  ["/", "Home"],
  ["/analyze", "Analyze"],
  ["/results", "Results"],
  ["/ast", "AST"],
  ["/samples", "Samples"],
  ["/about", "About"],
];
export default function SiteLayout() {
  const { analysis: a, comparison } = useWorkspace();
  const { pathname } = useLocation();
  const main = useRef(null);
  useEffect(() => {
    document.title = `OptiScope · ${links.find(([path]) => path === pathname)?.[1] || (pathname === "/compare" ? "Compare" : "Page not found")}`;
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="OptiScope home">
          <span className="logo">
            <Activity size={23} />
          </span>
          <strong>
            OptiScope<span className="brand-period">.</span>
          </strong>
        </Link>
        <nav className="tool-nav" aria-label="Main navigation">
          {links.map(([path, label]) => (
            <NavLink key={path} end={path === "/"} to={path}>
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="top-status">
          <Box size={14} />
          {a.health
            ? a.health.docker.available
              ? "SANDBOX READY"
              : "SANDBOX OFFLINE"
            : "CONNECTING"}
        </span>
      </header>
      <div className="workspace-strip">
        <span>
          <span className="local-dot" />
          LOCAL WORKSPACE
        </span>
        <span>{a.fileName || "NO FILE OPEN"}</span>
        <span>
          {a.busy || comparison.busy ? (
            <>
              <LoaderCircle size={12} className="spin" /> WORKING
            </>
          ) : a.result ? (
            "ANALYSIS RETAINED"
          ) : (
            "C++17"
          )}
        </span>
      </div>
      <main id="main-content" ref={main} tabIndex={-1}>
        <div key={pathname} className="route-page">
          <Outlet />
        </div>
      </main>
      <footer>
        <Link to="/" className="footer-brand">
          ◈ OptiScope
        </Link>
        <span>Compiler-assisted performance analysis</span>
        <Link to="/compare">Compare programs ↗</Link>
        <span>LOCAL / C++17</span>
      </footer>
    </div>
  );
}
