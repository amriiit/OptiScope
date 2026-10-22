# OptiScope UI design and verification

## Reference and visual system

The supplied Retro-OS UI Kit image was inspected before redesign. Its blue title bars, pale gray/white base, bitmap headings, small corner radii, and boxed controls inform an original OptiScope workspace. The image's gallery is not reproduced as the application layout.

- Palette: page `#f0f0ec`, surfaces white / `#f6f6f2`, blue `#0078d7`, dark blue `#005ba4`, text `#182434`, muted text `#566273`, borders `#b8bfca`, red utility/error `#bc1425`.
- Locally served Silkscreen for display headings; system sans for body; system monospace for source, metrics, and utility labels. No runtime font CDN request.
- One-pixel panel/control borders, 2–3 px corners, minimal inset/window shadows. No large decorative shadows.
- Links and buttons use short color transitions; routes enter with a small fade/translation. Reduced-motion preferences disable animation and transitions.
- Visible keyboard focus, semantic navigation with active-page state, skip link, labeled uploads, disabled busy controls, status/alert announcements, and scrollable code/tables.

## Page structure and shared state

`AppRoutes` renders Home, Analyze, Results, AST, Samples, About, and Compare inside `SiteLayout`. The layout owns navbar, workspace strip, main focus target, document title and footer. Direct HTTP route entry is served by Vite's development fallback or Express's existing production fallback.

`WorkspaceProvider` keeps the analysis and comparison hooks mounted above route changes. Source, mode, results, selected region/diagnostic, and comparison files/results survive navigation. Refresh clears the workspace. API calls remain in `services/apiClient.js`; all benchmark values come from real API responses.

Analyze owns setup and diagnostics; successful actions open Results. Results owns measurements and advice. AST owns structural exploration and compiler coverage. Samples loads actual allowlisted corpus files, selecting Clang for the DSA corpus without automatically running uploaded code. Comparison remains a separate execution-only study.

## Automated checks

- Server-rendered tests cover all routes, empty states, labeled controls, escaped output, and actual AST recommendation evidence.
- DOM interaction tests use the real local API to load and analyze a sample, select source regions, navigate across pages, retain a completed Docker profile, retain comparison uploads, filter the corpus, and open actual DSA source.
- Chart SVG/bar rendering is checked with test-supplied container dimensions. This is a DOM check, not viewport or visual QA.
- HTTP tests check all route entry points, all 12 corpus source responses, unchanged eight-item academic menu, and corpus traversal rejection.
- Original engine, HTTP, runtime, comparison, and presentation checks remain in the suite.

## Manual preflight — not yet verified

No connected browser provider was available during this redesign. Do not present the following as completed checks or attach fabricated screenshots.

1. Open http://127.0.0.1:5173; inspect Home at 1440, 1024, and 390 px widths.
2. Confirm local bitmap fonts load, navbar selection matches the route, and the page has no accidental horizontal overflow.
3. Navigate with Tab/Enter; check skip link, visible focus, selects, uploads, filters, AST disclosure controls and source-location buttons. Check back/forward navigation and direct route refresh.
4. Load `nested.cpp`, Analyze, Profile; inspect actual summary, chart, table, program output and recommendations. Select chart bars/table rows; confirm source highlighting and AST selection remain synchronized across navigation.
5. Open a Clang corpus sample; verify its source, diagnostics, excluded-region notes and unknown complexity cases. Test malformed source and unavailable Docker states.
6. Navigate away during analysis/profile; confirm the workspace strip signals work and the eventual result remains available.
7. Upload both comparison programs, navigate away/back, run comparison, and inspect raw timing metadata. Verify compile errors and mismatched output remain explicit.
8. Check long source lines, many AST nodes and tables with horizontal overflow at narrow widths; test reduced-motion mode.
9. Capture real Home/Analyze/Results/AST screenshots only after observing these pages in a browser.
