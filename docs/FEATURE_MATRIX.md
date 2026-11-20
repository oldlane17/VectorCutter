# VectorCutter Feature Matrix

| Category | Feature / Element ID | Handler / Module | Target Status | Verified |
|---|---|---|---|---|
| **File** | `menuNew` (New Document) | `editor/js/ui/menubar.js` | Working | [x] |
| **File** | `menuOpen` (Open SVG) | `editor/js/io/svg-import.js` | Working | [x] |
| **File** | `menuSave` (Export SVG) | `editor/js/io/svg-export.js` | Working | [x] |
| **File** | `menuDashboardSave` (Save to Dashboard) | `editor/js/core/storage.js` | Working | [x] |
| **File** | `menuExportPNG` (Export PNG) | `editor/js/io/png.js` | Working | [x] |
| **File** | `menuExportDXF` (Export DXF) | `editor/js/io/dxf.js` | Working | [x] |
| **Edit** | `menuUndo` (Undo Ctrl+Z) | `editor/js/core/history.js` | Working | [x] |
| **Edit** | `menuRedo` (Redo Ctrl+Y) | `editor/js/core/history.js` | Working | [x] |
| **Edit** | `menuDuplicate` (Duplicate Ctrl+D) | `editor/js/tools/select.js` | Working | [x] |
| **Edit** | `menuDelete` (Delete Del) | `editor/js/tools/select.js` | Working | [x] |
| **Edit** | `menuSelectAll` (Select All Ctrl+A) | `editor/js/core/store.js` | Working | [x] |
| **Edit** | `menuClearSelection` (Clear Selection) | `editor/js/core/store.js` | Working | [x] |
| **Edit** | `menuConvertToPath` (Convert to Paths) | `editor/js/ops/boolean.js` | Working | [x] |
| **Edit** | `menuTraceImage` (Contour Vector Trace) | `editor/js/io/trace.js` | Working | [x] |
| **Modify** | `menuBooleanUnion` (Weld) | `editor/js/ops/boolean.js` | Working | [x] |
| **Modify** | `menuBooleanDiff` (Difference) | `editor/js/ops/boolean.js` | Working | [x] |
| **Modify** | `menuBooleanIntersect` (Intersect) | `editor/js/ops/boolean.js` | Working | [x] |
| **Modify** | `menuBooleanExclude` (XOR) | `editor/js/ops/boolean.js` | Working | [x] |
| **Modify** | `menuKerfOffset` (Inset/Outset) | `editor/js/ops/offset.js` | Working | [x] |
| **Modify** | `menuOutlineStroke` | `editor/js/ops/offset.js` | Working | [x] |
| **Modify** | `menuLinearRepeat` | `editor/js/ops/repeat.js` | Working | [x] |
| **Modify** | `menuRotRepeat` | `editor/js/ops/repeat.js` | Working | [x] |
| **Modify** | `menuGridRepeat` | `editor/js/ops/repeat.js` | Working | [x] |
| **Modify** | `menuMirrorRepeat` | `editor/js/ops/repeat.js` | Working | [x] |
| **View** | `menuZoomIn` / `menuZoomOut` | `editor/js/view/camera.js` | Working | [x] |
| **View** | `menuResetZoom` (1:1 mm) | `editor/js/view/camera.js` | Working | [x] |
| **View** | `menuToggleGrid` | `editor/js/view/grid.js` | Working | [x] |
| **Tools** | `select` (V - 8-pt resize, rotate, marquee) | `editor/js/tools/select.js` | Working | [x] |
| **Tools** | `pan` (H / Space / Middle Click) | `editor/js/tools/pan.js` | Working | [x] |
| **Tools** | `rectangle` (R - live preview, square lock) | `editor/js/tools/rect.js` | Working | [x] |
| **Tools** | `circle` (C - live preview) | `editor/js/tools/circle.js` | Working | [x] |
| **Tools** | `ellipse` (live preview) | `editor/js/tools/ellipse.js` | Working | [x] |
| **Tools** | `polygon` (Hexagon regular n-gon) | `editor/js/tools/polygon.js` | Working | [x] |
| **Tools** | `star` (5-pointed star) | `editor/js/tools/star.js` | Working | [x] |
| **Tools** | `line` (L - 45° angle snap) | `editor/js/tools/line.js` | Working | [x] |
| **Tools** | `curve` / Node Edit (N - live arch) | `editor/js/tools/node.js` | Working | [x] |
| **Tools** | `path` / Pen (P - smooth freehand) | `editor/js/tools/pen.js` | Working | [x] |
| **Tools** | `text` (T - fonts & laser engrave) | `editor/js/tools/text.js` | Working | [x] |
| **Tools** | Shape & Template Library Modal | `editor/js/ui/modals.js` | Working | [x] |
| **Laser** | `laserModeSwitch` | `editor/js/laser/panel.js` | Working | [x] |
| **Theme** | `themeToggleBtn` (Light / Dark) | `editor/js/ui/theme.js` | Working | [x] |
