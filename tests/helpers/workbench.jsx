import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../frontend/src/App.jsx";
import {
  WorkspaceProvider,
  WorkspaceContext,
} from "../../frontend/src/controllers/WorkspaceContext.jsx";
export default function Workbench({ path = "/", value }) {
  const content = value ? (
    <WorkspaceContext.Provider value={value}>
      <AppRoutes />
    </WorkspaceContext.Provider>
  ) : (
    <WorkspaceProvider>
      <AppRoutes />
    </WorkspaceProvider>
  );
  return <MemoryRouter initialEntries={[path]}>{content}</MemoryRouter>;
}
