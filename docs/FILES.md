# Final source inventory and change map

Generated dependencies, parser build output and frontend production bundles are excluded. Existing five locked specifications and six original samples are preserved. `.gitignore` was already user-modified and was not changed by this refactor. The initial `routes/api.js` working edit was retained behaviorally while its code moved into focused MVC modules.

The structure below records the MVC/C++17 baseline; the final section lists the multi-page redesign additions. README contains the current high-level structure.

## Baseline folder structure

```text
.dockerignore
.gitignore
.vscode/c_cpp_properties.json
.vscode/launch.json
.vscode/settings.json
Makefile
README.md
backend/package.json
backend/src/app.js
backend/src/config/limits.js
backend/src/controllers/AnalysisController.js
backend/src/controllers/ComparisonController.js
backend/src/controllers/HealthController.js
backend/src/controllers/SampleController.js
backend/src/infrastructure/DockerRunner.js
backend/src/infrastructure/EngineRunner.js
backend/src/infrastructure/JobWorkspace.js
backend/src/infrastructure/ProcessRunner.js
backend/src/middleware/errorHandler.js
backend/src/middleware/jobLimiter.js
backend/src/middleware/localOnly.js
backend/src/middleware/upload.js
backend/src/models/AnalysisResult.js
backend/src/models/ComparisonResult.js
backend/src/models/ProfileRecord.js
backend/src/models/ProgramRegion.js
backend/src/models/SourceUpload.js
backend/src/routes/analysisRoutes.js
backend/src/routes/api.js
backend/src/routes/comparisonRoutes.js
backend/src/routes/healthRoutes.js
backend/src/routes/sampleRoutes.js
backend/src/server.js
backend/src/services/AnalysisService.js
backend/src/services/ComparisonService.js
backend/src/services/HotspotService.js
backend/src/services/ProfilingService.js
backend/src/services/RecommendationService.js
backend/src/services/SampleService.js
backend/src/services/analyzer.js
backend/src/services/process.js
backend/src/services/sandbox.py
docs/00_MASTER_SPEC.md
docs/01_VERSION_1.md
docs/02_VERSION_2.md
docs/03_VERSION_3.md
docs/04_ENGINEERING_DECISIONS.md
docs/API.md
docs/AUDIT_BASELINE.md
docs/CODE_WALKTHROUGH.md
docs/FILES.md
docs/IMPLEMENTATION_STATUS.md
docs/KNOWN_LIMITATIONS.md
docs/MVC_ARCHITECTURE.md
docs/PRACTICAL_DEMO_GUIDE.md
docs/UI_DESIGN_GUIDE.md
docs/VALIDATION.md
engine/Dockerfile
engine/include/ast.hpp
engine/include/complexity.hpp
engine/include/instrumenter.hpp
engine/include/regions.hpp
engine/include/serialization.hpp
engine/include/traversal.hpp
engine/lexer/lexer.l
engine/parser/parser.y
engine/src/complexity.cpp
engine/src/instrumenter.cpp
engine/src/main.cpp
engine/src/profiler.cpp
engine/src/recommendations.cpp
engine/src/regions.cpp
engine/src/serialization.cpp
engine/src/traversal.cpp
frontend/index.html
frontend/package.json
frontend/postcss.config.js
frontend/src/App.jsx
frontend/src/components/AstTree.jsx
frontend/src/components/Hotspots.jsx
frontend/src/components/RuntimeChart.jsx
frontend/src/components/SourceViewer.jsx
frontend/src/components/regionPresentation.js
frontend/src/controllers/useAnalysisController.js
frontend/src/controllers/useComparisonController.js
frontend/src/index.css
frontend/src/main.jsx
frontend/src/models/analysisModel.js
frontend/src/models/comparisonModel.js
frontend/src/models/regionModel.js
frontend/src/models/sourceModel.js
frontend/src/pages/Dashboard.jsx
frontend/src/services/apiClient.js
frontend/src/views/components/AnalysisActions.jsx
frontend/src/views/components/ProgramOutput.jsx
frontend/src/views/components/RecommendationPanel.jsx
frontend/src/views/components/SummaryCards.jsx
frontend/src/views/components/UploadPanel.jsx
frontend/src/views/pages/Comparison.jsx
frontend/src/views/pages/Dashboard.jsx
frontend/vite.config.js
package-lock.json
package.json
samples/comparison/optimized.cpp
samples/comparison/original.cpp
samples/independent.cpp
samples/linear.cpp
samples/logarithmic.cpp
samples/mixed_hotspots.cpp
samples/nested.cpp
samples/patterns.cpp
samples/sequential.cpp
samples/triple.cpp
tests/api.test.mjs
tests/comparison.test.mjs
tests/engine.test.mjs
tests/frontend-api.test.mjs
tests/mvc.test.mjs
tests/presentation.test.mjs
tests/runtime.test.mjs
tests/views.test.mjs
```

## Responsibility moves

| Original location | Final ownership |
|---|---|
| `backend/src/routes/api.js` | Focused route files, controllers, upload/local/job middleware and SourceUpload model |
| `backend/src/services/analyzer.js` | Analysis/Profiling/Hotspot/Recommendation services; Engine/Docker/Workspace infrastructure; result/profile models. Old path remains a compatibility export. |
| `backend/src/services/process.js` | `infrastructure/ProcessRunner.js`; compatibility export retained |
| `backend/src/server.js` | App assembly in `app.js`, listener in `server.js` |
| `engine/src/main.cpp` algorithms | `complexity.cpp`, `regions.cpp`, `recommendations.cpp`, `instrumenter.cpp`, `profiler.cpp`, `serialization.cpp`, `traversal.cpp` and corresponding shared headers |
| `frontend/src/pages/Dashboard.jsx` | `controllers/useAnalysisController.js`, models, apiClient and focused views; original path remains a compatibility export |
| `frontend/src/components/regionPresentation.js` | `models/regionModel.js`; compatibility export retained |

New functionality: comparison model/service/controller/route, sandbox comparison mode, comparison hook/model/view, two-file demo pair, cubic/independent demos. New tests cover MVC data/lifecycle, frontend HTTP bindings, view rendering and real comparison. Existing engine/API/runtime/presentation coverage is retained; API/runtime suites now include all eight analysis samples.

## Files created and modified

The following working-tree inventory includes all agent changes and the pre-existing `.gitignore` edit (`M` modified, `??` created). No files were deleted; responsibility moves retain compatibility entrypoints.

```text
 M .gitignore
 M Makefile
 M README.md
 M backend/src/routes/api.js
 M backend/src/server.js
 M backend/src/services/analyzer.js
 M backend/src/services/process.js
 M backend/src/services/sandbox.py
 M docs/API.md
 M docs/FILES.md
 M docs/VALIDATION.md
 M engine/src/main.cpp
 M frontend/src/App.jsx
 M frontend/src/components/AstTree.jsx
 M frontend/src/components/Hotspots.jsx
 M frontend/src/components/RuntimeChart.jsx
 M frontend/src/components/SourceViewer.jsx
 M frontend/src/components/regionPresentation.js
 M frontend/src/index.css
 M frontend/src/main.jsx
 M frontend/src/pages/Dashboard.jsx
 M tests/api.test.mjs
 M tests/engine.test.mjs
 M tests/runtime.test.mjs
?? backend/src/app.js
?? backend/src/config/limits.js
?? backend/src/controllers/AnalysisController.js
?? backend/src/controllers/ComparisonController.js
?? backend/src/controllers/HealthController.js
?? backend/src/controllers/SampleController.js
?? backend/src/infrastructure/DockerRunner.js
?? backend/src/infrastructure/EngineRunner.js
?? backend/src/infrastructure/JobWorkspace.js
?? backend/src/infrastructure/ProcessRunner.js
?? backend/src/middleware/errorHandler.js
?? backend/src/middleware/jobLimiter.js
?? backend/src/middleware/localOnly.js
?? backend/src/middleware/upload.js
?? backend/src/models/AnalysisResult.js
?? backend/src/models/ComparisonResult.js
?? backend/src/models/ProfileRecord.js
?? backend/src/models/ProgramRegion.js
?? backend/src/models/SourceUpload.js
?? backend/src/routes/analysisRoutes.js
?? backend/src/routes/comparisonRoutes.js
?? backend/src/routes/healthRoutes.js
?? backend/src/routes/sampleRoutes.js
?? backend/src/services/AnalysisService.js
?? backend/src/services/ComparisonService.js
?? backend/src/services/HotspotService.js
?? backend/src/services/ProfilingService.js
?? backend/src/services/RecommendationService.js
?? backend/src/services/SampleService.js
?? docs/AUDIT_BASELINE.md
?? docs/CODE_WALKTHROUGH.md
?? docs/IMPLEMENTATION_STATUS.md
?? docs/KNOWN_LIMITATIONS.md
?? docs/MVC_ARCHITECTURE.md
?? docs/PRACTICAL_DEMO_GUIDE.md
?? docs/UI_DESIGN_GUIDE.md
?? docs/evidence/comparison-demo.json
?? docs/evidence/locked-documents.sha256
?? engine/include/complexity.hpp
?? engine/include/instrumenter.hpp
?? engine/include/regions.hpp
?? engine/include/serialization.hpp
?? engine/include/traversal.hpp
?? engine/src/complexity.cpp
?? engine/src/instrumenter.cpp
?? engine/src/profiler.cpp
?? engine/src/recommendations.cpp
?? engine/src/regions.cpp
?? engine/src/serialization.cpp
?? engine/src/traversal.cpp
?? frontend/src/controllers/useAnalysisController.js
?? frontend/src/controllers/useComparisonController.js
?? frontend/src/models/analysisModel.js
?? frontend/src/models/comparisonModel.js
?? frontend/src/models/regionModel.js
?? frontend/src/models/sourceModel.js
?? frontend/src/services/apiClient.js
?? frontend/src/views/components/AnalysisActions.jsx
?? frontend/src/views/components/ProgramOutput.jsx
?? frontend/src/views/components/RecommendationPanel.jsx
?? frontend/src/views/components/SummaryCards.jsx
?? frontend/src/views/components/UploadPanel.jsx
?? frontend/src/views/pages/Comparison.jsx
?? frontend/src/views/pages/Dashboard.jsx
?? samples/comparison/optimized.cpp
?? samples/comparison/original.cpp
?? samples/independent.cpp
?? samples/triple.cpp
?? tests/comparison.test.mjs
?? tests/frontend-api.test.mjs
?? tests/mvc.test.mjs
?? tests/views.test.mjs
```

`docs/VALIDATION.md`, `docs/API.md`, README and evidence logs additionally record the completed validation and operational changes. See `MVC_ARCHITECTURE.md` for layer boundaries and `CODE_WALKTHROUGH.md` for exact functions. Full V3 report/three-study work is still absent.


## C++17 upgrade file map (relative to the preserved MVC working tree)

New implementation files:

```text
backend/src/infrastructure/FrontendRunner.js
engine/include/frontend.hpp
engine/include/stl_costs.hpp
engine/include/recurrences.hpp
engine/clang/frontend.cpp
engine/clang/main.cpp
engine/src/legacy_frontend.cpp
engine/src/stl_costs.cpp
engine/src/recurrences.cpp
frontend/src/views/components/AnalysisCoverage.jsx
tests/cpp17.test.mjs
samples/dsa/arrays.cpp
samples/dsa/sort_search.cpp
samples/dsa/strings_two_pointers.cpp
samples/dsa/linked_list.cpp
samples/dsa/stacks_queues.cpp
samples/dsa/trees_bst.cpp
samples/dsa/graphs.cpp
samples/dsa/disjoint_sets.cpp
samples/dsa/dynamic_programming.cpp
samples/dsa/backtracking.cpp
samples/dsa/modern_cpp.cpp
samples/dsa/stress.cpp
```

Modified integration: Makefile and Dockerfile; AST semantic metadata/shared cost/region/instrumenter/profiler modules; DockerRunner, AnalysisService, ProfilingService, HotspotService, AnalysisController and sandbox.py; apiClient, useAnalysisController, Dashboard, AnalysisCoverage integration, AST/hotspot/chart presentation, regionModel, summary labels and shared CSS. Existing tests were preserved; the new test file adds compiler/DSA/security/frontend coverage. README and the existing architecture/walkthrough/API/status/limitations/validation/design/demo/audit documentation were updated rather than creating a competing spec set.

The exact workspace stress source is copied unchanged. The original six samples, original eight-item sample menu, lexer and grammar, comparison feature and all five locked SOT files are preserved. Existing `.gitignore` changes predate this task and remain untouched. No remote branch, merge or push was performed.

New evidence is under `docs/evidence/cpp17-*` with text build/test logs, canonical golden hashes and full measured stress output. No generated parser source is added to version control. Prior uncommitted MVC work remains part of the current local branch.

## Multi-page redesign additions (23 October 2026)

- `frontend/src/App.jsx`: route tree and root provider; `views/layouts/SiteLayout.jsx`: navigation and page shell.
- `controllers/WorkspaceContext.jsx`: persistent analysis/comparison controller state across navigation.
- `views/pages/{Home,Analyze,Results,Structure,Samples,About}.jsx`: focused pages; Comparison remains separate; Dashboard is a compatibility alias to Analyze.
- `views/components/{PageHeading,EmptyWorkspace,WorkspaceStatus}.jsx`: shared route UI.
- `index.css`, `main.jsx`: light blue retro theme and locally bundled Silkscreen font.
- `SampleService`, `SampleController`, `sampleRoutes`, `apiClient`: additive allowlisted corpus loading.
- `tests/navigation.test.mjs`, `tests/helpers/workbench.jsx`, `tests/views.test.mjs`: real HTTP source/routes, DOM persistence and updated design acceptance checks.
- README, API, architecture, demo, UI, limitations, status and validation documents: updated workflow and honest QA boundaries.

The compiler engine and Docker isolation implementation have no changes in this redesign relative to safety checkpoint `9a34332`.
