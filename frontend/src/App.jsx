import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WorkspaceProvider } from "./controllers/WorkspaceContext.jsx";
import SiteLayout from "./views/layouts/SiteLayout.jsx";
import Home from "./views/pages/Home.jsx";
import Analyze from "./views/pages/Analyze.jsx";
import Results from "./views/pages/Results.jsx";
import Structure from "./views/pages/Structure.jsx";
import Samples from "./views/pages/Samples.jsx";
import About from "./views/pages/About.jsx";
import Comparison from "./views/pages/Comparison.jsx";
import EmptyWorkspace from "./views/components/EmptyWorkspace.jsx";
import PageHeading from "./views/components/PageHeading.jsx";
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="analyze" element={<Analyze />} />
        <Route path="results" element={<Results />} />
        <Route path="ast" element={<Structure />} />
        <Route path="samples" element={<Samples />} />
        <Route path="about" element={<About />} />
        <Route
          path="compare"
          element={
            <>
              <PageHeading number="07" title="Compare programs" />
              <Comparison />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <PageHeading number="404" title="Page not found" />
              <EmptyWorkspace title="Return to the workspace" />
            </>
          }
        />
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <AppRoutes />
      </WorkspaceProvider>
    </BrowserRouter>
  );
}
