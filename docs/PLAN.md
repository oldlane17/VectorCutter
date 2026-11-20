# VectorCutter Rebuild Plan

## Strategy Overview
Following `instructions.md`, we are replacing the legacy monkey-patched monolithic prototype architecture (`SVGEditor.prototype`) with a clean, modular Native ES Module architecture (`<script type="module">`).

### What to Replace:
1. **Camera & Zoom**: Replace the buggy `viewBox`-based zoom and the hard-coded `1200` width math with an exact Camera `{ x, y, scale }` in mm where scale is screen pixels per mm and all scene elements live in `<g id="world" transform="matrix(...)">`.
2. **Selection Overlays**: Move all bounding boxes, handles, and rotation controls out of the SVG artwork DOM into a dedicated screen-space overlay layer (`<svg id="overlay">`). Handles remain constant 9px at all zoom levels; resize cursors dynamically orient to element rotation.
3. **Document Store & History**: Replace DOM-as-document and fragile `outerHTML` undo stacks with a formal, normalized document state `{ version, units: 'mm', elements: {}, order: [], selection: [], settings: {} }` and command-based undo/redo.
4. **CSS & Theming**: Replace 1965 lines of conflicting CSS and 235 hardcoded colors with a clean token-based design system (`tokens.css`, `base.css`, `layout.css`, `components.css`, `themes.css`) supporting Dark, Light, and System themes.
5. **Storage**: Centralize all storage in `core/storage.js` with defensive try/catch and in-memory fallbacks to prevent Tracking Prevention security errors.
6. **No Third-Party Runtime CDN Calls**: Self-host vendor libraries and fonts with zero runtime dependencies on Google Fonts, jsDelivr, or Google Tag Manager.

### Core Contracts Preserved:
- `/editor` and `editor.html` entry point.
- Dashboard integration: reads/writes `localStorage['vc_projects']` with `?pid=<id>` support.
- Sidebar tool icons in `sidebar/*.svg`.
- Template SVGs in `templates/`.
- Credits text preserved.

---

## Milestone Execution Order
- **M0**: Audit & Feature Matrix (`docs/FEATURE_MATRIX.md`, `docs/PLAN.md`)
- **M1**: Foundation (App Shell, ES Modules, `storage.js`, `log.js`, Tokens & Theming)
- **M2**: Model, Store, Commands & History
- **M3**: Camera, World Matrix, Canvas Grid, Rulers & Smooth Wheel Input
- **M4**: Screen-Space Selection Overlay, Constant Handles, Oriented Cursors & Snapping
- **M5**: Modern UI Shell (Top Menubar, Adaptive Left Sidebar, Properties Panel, Floating Quickbar, Status Bar)
- **M6**: Drawing Tools, Bezier / Node Edit, Font Picker & Typography Engine
- **M7**: Native SVG Import/Export, DXF, PDF & Real Vector Tracing
- **M8**: Laser Cutting Mode (Cut, Score, Engrave, Bed Setup, Checks Panel & Ordering)
- **M9**: Geometry Ops (Clipper Booleans, Kerf Offsets, Fillet, Weld & Score, Parametric Repeats)
- **M10**: Polish, Acceptance Tests & Verification
