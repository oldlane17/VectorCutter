# VectorCutter Feature Matrix

| Category | Feature / Element ID | Handler / Module | Target Status | Verified |
|---|---|---|---|---|
| **File** | `menuNew` (New Document) | `commands/doc.js` | Working | [ ] |
| **File** | `menuOpen` (Open SVG) | `io/svg-import.js` | Working | [ ] |
| **File** | `menuSave` (Export SVG) | `io/svg-export.js` | Working | [ ] |
| **File** | `menuDashboardSave` (Save to Dashboard) | `core/storage.js` | Working | [ ] |
| **File** | `menuExport` (Export PNG) | `io/png.js` | Working | [ ] |
| **File** | `menuExportDXF` (Export DXF) | `io/dxf.js` | Working | [ ] |
| **File** | `menuExportPDF` (Export PDF) | `io/pdf.js` | Working | [ ] |
| **Edit** | `menuUndo` (Undo Ctrl+Z) | `core/history.js` | Working | [ ] |
| **Edit** | `menuRedo` (Redo Ctrl+Y) | `core/history.js` | Working | [ ] |
| **Edit** | `menuCut` (Cut Ctrl+X) | `commands/clipboard.js` | Working | [ ] |
| **Edit** | `menuCopy` (Copy Ctrl+C) | `commands/clipboard.js` | Working | [ ] |
| **Edit** | `menuPaste` (Paste Ctrl+V) | `commands/clipboard.js` | Working | [ ] |
| **Edit** | `menuDuplicate` (Duplicate Ctrl+D) | `commands/elements.js` | Working | [ ] |
| **Edit** | `menuDelete` (Delete Del) | `commands/elements.js` | Working | [ ] |
| **Edit** | `menuSelectAll` (Select All Ctrl+A) | `view/selection.js` | Working | [ ] |
| **Edit** | `menuClearSelection` (Clear Selection) | `view/selection.js` | Working | [ ] |
| **Edit** | `menuGroup` (Group Ctrl+G) | `commands/groups.js` | Working | [ ] |
| **Edit** | `menuUngroup` (Ungroup Ctrl+Shift+G) | `commands/groups.js` | Working | [ ] |
| **Edit** | `menuBringFront` / `menuSendBack` | `commands/order.js` | Working | [ ] |
| **Edit** | `menuConvertToPaths` | `ops/text-ops.js` | Working | [ ] |
| **Edit** | `menuTraceImage` (Vector Trace) | `io/trace.js` | Working | [ ] |
| **Modify** | `menuBooleanUnion` (Weld) | `ops/boolean.js` | Working | [ ] |
| **Modify** | `menuBooleanDiff` (Difference) | `ops/boolean.js` | Working | [ ] |
| **Modify** | `menuBooleanIntersect` (Intersect) | `ops/boolean.js` | Working | [ ] |
| **Modify** | `menuBooleanExclude` (XOR) | `ops/boolean.js` | Working | [ ] |
| **Modify** | `menuKerfOffset` (Inset/Outset) | `ops/offset.js` | Working | [ ] |
| **Modify** | `menuOutlineStroke` | `ops/offset.js` | Working | [ ] |
| **Modify** | `menuMergePaths` | `ops/paths.js` | Working | [ ] |
| **Modify** | `menuRemoveHoles` | `ops/paths.js` | Working | [ ] |
| **Modify** | `menuRoundCorners` (Fillet) | `ops/fillet.js` | Working | [ ] |
| **Modify** | `menuChamfer` (Bevel) | `ops/fillet.js` | Working | [ ] |
| **Modify** | `menuWeldScore` (Weld & Score) | `ops/laser-ops.js` | Working | [ ] |
| **Modify** | `menuFitWithin` | `ops/transform.js` | Working | [ ] |
| **Modify** | `menuLinearRepeat` | `ops/repeat.js` | Working | [ ] |
| **Modify** | `menuRotRepeat` | `ops/repeat.js` | Working | [ ] |
| **Modify** | `menuGridRepeat` | `ops/repeat.js` | Working | [ ] |
| **Modify** | `menuMirrorRepeat` | `ops/repeat.js` | Working | [ ] |
| **Modify** | `menuDashedLine` | `ops/dashes.js` | Working | [ ] |
| **Modify** | `menuNestSheet` | `ops/nesting.js` | Working | [ ] |
| **Modify** | `menuLayeredStack` | `ops/stack.js` | Working | [ ] |
| **Modify** | `menuTextAlongPath` | `ops/text-path.js` | Working | [ ] |
| **Modify** | `menuTextWithinBox` | `ops/text-box.js` | Working | [ ] |
| **View** | `menuZoomIn` / `menuZoomOut` | `view/camera.js` | Working | [ ] |
| **View** | `menuResetZoom` / `menuZoomRealSize` | `view/camera.js` | Working | [ ] |
| **View** | `menuFitAll` / `menuFitSelected` | `view/camera.js` | Working | [ ] |
| **View** | `menuScrollTrackpad` / `menuScrollMouse` | `view/input.js` | Working | [ ] |
| **View** | `menuToggleGrid` | `view/grid.js` | Working | [ ] |
| **Tools** | `select` (V) | `tools/select.js` | Working | [ ] |
| **Tools** | `pan` (H / Space) | `tools/pan.js` | Working | [ ] |
| **Tools** | `rectangle` (R) | `tools/rect.js` | Working | [ ] |
| **Tools** | `circle` (C) | `tools/circle.js` | Working | [ ] |
| **Tools** | `ellipse` | `tools/ellipse.js` | Working | [ ] |
| **Tools** | `line` (L) | `tools/line.js` | Working | [ ] |
| **Tools** | `curve` / Node Edit (N) | `tools/node.js` | Working | [ ] |
| **Tools** | `path` / Pen (P) | `tools/pen.js` | Working | [ ] |
| **Tools** | `text` (T) | `tools/text.js` | Working | [ ] |
| **Tools** | Shape Library Modal | `ui/shape-library.js` | Working | [ ] |
| **Laser** | `laserModeToggle` | `laser/panel.js` | Working | [ ] |
| **Theme** | `themeToggleBtn` | `ui/theme.js` | Working | [ ] |
