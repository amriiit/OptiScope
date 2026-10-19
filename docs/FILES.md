# Files implemented for this MVP

Source/configuration files (generated `node_modules/`, `engine/build/` and `frontend/dist/` excluded):

```text
.gitignore
.dockerignore
Makefile
package.json
package-lock.json
README.md
backend/package.json
backend/src/server.js
backend/src/routes/api.js
backend/src/services/analyzer.js
backend/src/services/process.js
backend/src/services/sandbox.py
engine/Dockerfile
engine/include/ast.hpp
engine/lexer/lexer.l
engine/parser/parser.y
engine/src/main.cpp
frontend/package.json
frontend/index.html
frontend/vite.config.js
frontend/postcss.config.js
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/index.css
frontend/src/pages/Dashboard.jsx
frontend/src/components/AstTree.jsx
frontend/src/components/Hotspots.jsx
frontend/src/components/RuntimeChart.jsx
frontend/src/components/SourceViewer.jsx
samples/linear.cpp
samples/nested.cpp
samples/sequential.cpp
samples/logarithmic.cpp
samples/mixed_hotspots.cpp
samples/patterns.cpp
tests/engine.test.mjs
tests/api.test.mjs
tests/runtime.test.mjs
docs/API.md
docs/VALIDATION.md
docs/FILES.md
```

Other specification/version documents in `docs/` were not created or changed by this implementation.
