# UI design guide

## Reference and evidence

No visual reference image was available. `design/reference.png` does not exist and the chat attachment contained text only. The implementation follows the explicit Phase 1.3 requirements; no claim of inspecting a portfolio image is made.

Browser visual QA is **NOT VERIFIED**. Attempted `iab` creation returned unavailable; browser inventory had no providers; native Chrome inspection waited on macOS Accessibility/Screen Recording permissions. Exact browser viewports and live interactions tested: **none**. The requested desktop/narrow/mobile acceptance remains a manual preflight.

## Design system

All tokens are defined once at the start of `frontend/src/index.css`:

| Token | Value / purpose |
|---|---|
| `--page` | `#0B0B0B` |
| `--surface` / `--surface-raised` | `#141414` / `#181818` |
| `--border` | `#343434` |
| `--text` / `--muted` | `#F5F5F5` / `#A6A6A6` |
| `--accent` | `#95D5B2`, selected source/regions and healthy state |
| `--caution` / `--error` | `#E5C486` / `#EDACB3`, genuine caution/failure |
| `--radius` / `--space` | 12px panels / 8px base spacing reference |
| `--focus` | 2px off-white outline, 4px offset |
| `--mono` | ui-monospace, SFMono-Regular, Menlo, Consolas, monospace |

System sans-serif is used for prose; mono for editorial heading, source, technical labels and numeric measurements. No remote fonts, gradients, stock imagery, glow, glass effects or decorative hero circles. Primary actions are white pills with near-black text; secondary actions use quiet outlines. Chart's leading measured bar uses mint and other regions neutral gray; all bars remain named by real region ID. There is one duration series, so no distinct measurement series were collapsed.

## Layout

Header contains wordmark, local metadata and anchor navigation to analysis/comparison. The compact two-line heading leaves the tool prominent. Source input and sample controls precede actions and a low-chrome metrics strip. Source/chart and AST/recommendations each use two columns on desktop. Hotspots retain all eight information columns and measured denominator explanations. Comparison follows the core workflow and has its own paired upload controls and raw evidence disclosure.

At ≤1050px panels/metrics use tighter spacing and the sample controls stack; at ≤760px source/chart, AST/recommendations and comparison inputs stack. Metrics become two columns. Tool actions wrap their labels; file controls are constrained to container width. Source, AST and wide data tables have their own overflow regions; the page should not need horizontal scrolling. Runtime charts grow internally with region count and scroll vertically instead of squeezing labels. These are implemented CSS rules, not observed viewport results.

Intentional deviations from portfolio inspiration: no work history, portraits, marketing sections or copied portfolio content. Data-heavy tables retain local/enclosing explanation, timing columns and safe horizontal scrolling. Source/AST keep dedicated technical scroll panes. Warnings, diagnostics and measurement uncertainty remain visible or clearly disclosed.

## Accessibility and state

Preserved labeled file/sample inputs, semantic tables, region row keyboard Enter handlers, native details/summary AST toggles, source links, disabled/loading controls, role=status progress and role=alert errors. Added shared visible focus and reduced-motion CSS; source selection scroll uses immediate behavior. Chart selection has an equivalent keyboard-operable hotspot table. Timings show unavailable until measured. Compiler/runtime output remains escaped React text.

Automated checks cover actual JSX markup, disabled upload controls, output escaping, real recommendation text, selected AST/source rendering, token presence and reduced-motion rules. Builds and server rendering cannot certify contrast in every rendered state, focus movement, hover tooltips or responsive geometry.

## Manual acceptance still required

Use 1440×900, 1024×768, 768×1024 and 390×844. Check long filenames and many regions; verify no page overflow, uncut actions/labels, readable critical columns via table scroll, file upload/drop, all samples, Analyze/Profile, AST toggles, hotspot/chart/recommendation source selection, diagnostics, comparison inputs/results and Tab/Enter focus. Do not mark these complete without a real browser run.


## C++17 coverage presentation

The compact Compiler frontend selector is owned by the existing analysis controller and sends only validated mode values through apiClient. Changing mode clears stale results. `AnalysisCoverage.jsx` displays parsing status separately from confidence/instrumentability, source-linked main-file diagnostics, skipped-region reasons and expandable STL/recurrence evidence. Hotspots show confidence and distinguish Not instrumented from Not executed. The AST caption identifies Clang normalized IR or Flex/Bison accurately. Styling reuses existing tokens; no new UI/font dependency was added.

The upgrade's tests pass actual Clang stress results through server-rendered AST/coverage views and the real HTTP API client. No additional visual screenshots or live browser interactions were completed. Browser viewport acceptance remains NOT VERIFIED.
