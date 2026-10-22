import { createContext, useContext } from "react";
import { useAnalysisController } from "./useAnalysisController.js";
import { useComparisonController } from "./useComparisonController.js";
export const WorkspaceContext = createContext(null);
export function WorkspaceProvider({ children }) {
  const analysis = useAnalysisController();
  const comparison = useComparisonController();
  return (
    <WorkspaceContext.Provider value={{ analysis, comparison }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("WorkspaceProvider is required");
  return workspace;
}
