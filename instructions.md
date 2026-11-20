# VectorCutter Editor – Rescue & Rebuild Instructions

**Target agent:** Gemini (fast "Flash"-class model) in Google Antigravity
**Repo:** https://github.com/Oldlane17/VectorCutter
**Live page:** https://vectorcutter.oldlane17.com/editor
**Reference product:** https://cuttle.xyz (free competitor goal)

---

## 0. READ THIS FIRST

### 0.1 You are free to replace everything
The current editor is a pile of patches. Previous rounds of "fix this bug" prompts made it **not better**. Therefore:

- **You may delete, rewrite, rename, restructure and replace any file, any module, any architecture.** Nothing in the current editor code is sacred.
- If a part cannot be fixed cleanly, **replace it, do not patch it.** Do not add `setTimeout` hacks, `try/catch` that swallow errors, `if (this.initX)` guards, or "FIX:" comments on top of broken logic.
- The only things that must survive are the **user-facing contracts** listed in section 3.
- A working smaller editor is better than a large broken one. **Usable first, complete second.**

### 0.2 How to work (important for a fast model)
1. Work in **small milestones** (section 12). After each milestone: run the app in the Antigravity browser, run the acceptance checks, take screenshots, and commit with a clear message. Do not start milestone N+1 while N has failing checks.
2. **Re-read a file right before editing it.** Do not rely on memory of what a file contained.
3. **Never claim something works unless you verified it in the browser** (click it, zoom with the real wheel, rotate an element, import an SVG). "The code looks right" is not verification.
4. Prefer **many small files** (< 400 lines each) with one responsibility over giant files. The current `editor-transform.js` (≈1960 lines) and `editor-core.js` (≈1220 lines) are exactly the problem.
5. Write the plan to `docs/PLAN.md` before coding, keep `docs/FEATURE_MATRIX.md` updated (section 11), and write `docs/ARCHITECTURE.md` when the new architecture is in place.
6. No placeholder features: no `alert('coming soon')`, no menu item without a working handler. A feature is **working or removed from the UI**.

### 0.3 What was inspected (and what was not)
This document is based on a real read of these files from the repo: `editor.html`, `editor.css`, `editor-core.js`, `editor-canvas.js`, `editor-tools.js`, `editor-transform.js`, `editor-fonts.js`, `editor-code.js`, `editor-init.js`, `editor-sidebar-resize.js`, `editor-trace.js`, plus the live page's rendered structure and the console output.

**Not seen** (but referenced by `editor.html`): `editor-selection.js`, `editor-properties.js`, `editor-elements-tree.js`, `editor-laser-mode.js`, `editor-export.js`, `editor-templates.js`, `editor-quickbar.js`, `editor-boolean.js`, `editor-shapes-library.js`, `editor-patterns.js`, `editor-production.js`, `editor-components.js`, `editor-text-tools.js`, `editor-dxf.js`. **Read all of them in Phase 0** and judge them with the same criteria. Do not assume they are good because they are not listed as bad below.

---

## 1. Diagnosis – root causes found in the current code

These are **verified from the code**, not guesses. Each one explains a symptom the owner sees.

### 1.1 Zoom is mathematically wrong (symptom: "zooming is horrible, focus is random")
- `editor-canvas.js` computes `this.zoomLevel = 1200 / this.viewBox.width` with a **hard-coded `1200`** in at least 8 places (`updateViewBox`, `zoomTowards`, `zoomAtCenter`, `zoomToRealSize`, `zoomToFitAll`, …).
- But `editor-core.js → init()` sets the viewBox width to the **container's pixel width** (e.g. 1380), so at startup `zoomLevel` is not 1. Grid spacing, axis font size, line widths and selection-handle sizes all divide by this wrong number.
- `handleCanvasResize()` (called by the `ResizeObserver`, sidebar drag, collapse button, window resize) **changes `viewBox.width`** while keeping scale. Because the "1200" base never changes, `zoomLevel` **drifts every time the layout changes** (e.g. collapsing the sidebar changes the grid and handles).
- `zoomTowards()` computes the mouse position as a fraction of the **viewBox**, which is only correct if the viewBox aspect ratio equals the `<svg>` element's aspect ratio. The `<svg>` uses default `preserveAspectRatio="xMidYMid meet"`, so whenever the aspect ratios differ the content is letter-boxed and the focus point is off. `panBy`/`pan` have the same flaw.
- `updateViewBox()` **rebuilds the entire grid and axes as DOM nodes on every wheel event** (hundreds of `<line>` elements), plus handles.
- Wheel handling mixes detection heuristics (`hasDetectedScrollMode`) and `deltaMode` guesses and defaults to *trackpad* mode, so a normal mouse wheel pans instead of zooming.

**Verdict: replace the whole view/camera system** (section 5).

### 1.2 Selection markers shrink with the object (symptom: handles behave like part of the element)
- Selection is shown with `el.style.outline = '2px dashed #007acc'` on the SVG element itself (13 uses across the files). CSS `outline` on SVG children is scaled by the element's transform/zoom and is **serialized into history and into the code view** (they manually strip it in `saveState` and the code editor).
- Handles live in the **same SVG and the same viewBox** as the artwork (`selectionGroup`) and are re-computed in SVG units by dividing by the (wrong) `zoomLevel`.

**Verdict: replace** with a separate screen-space overlay (section 6.2).

### 1.3 "The code that keeps track of the current elements bugs" (symptom: list/canvas/properties disagree)
- **The DOM is the document.** `getUserElements()` scans the canvas children. There is no model, no IDs, no single source of truth.
- Undo/redo = array of `outerHTML` strings (max 50), restored by deleting all user nodes and re-parsing them. After every undo, **all references in `selectedElements`, the elements list and the properties panel point to dead nodes.**
- `saveState()` is called by hand in ≥25 places; any forgotten call = broken history. Intermediate states are skipped by comments like "Removed this.saveState() to prevent saving empty states".
- Selected state is stored as styles on nodes, selection arrays, `selectedElement` **and** `selectedElements` (two overlapping variables).

**Verdict: replace** with a model + store + renderer (section 4).

### 1.4 Script architecture is fragile
- 28 classic `<script>` tags that all do `Object.assign(SVGEditor.prototype, {...})`. Order-dependent, no module boundaries, any function can overwrite any other.
- `init()` uses guards like `if (this.initFonts) this.initFonts();` – a missing or failed file **silently disables a feature** (this is why features look "not implemented").
- `setupMenuHandlers()` does `document.getElementById('menuX').addEventListener(...)` **without null checks**. One renamed/missing id throws and aborts the rest of `init()`, leaving the editor half-initialised.
- Console: `Refused to execute script from '.../editor/js/editor-qol.js' because its MIME type ('text/html')…` → **the file `editor-qol.js` does not exist on the server** (the host returns an HTML page). `initQoL` is therefore never defined, silently. Verify that **every** script referenced in `editor.html` exists in the repo and in the deployment (check case-sensitivity, `.gitignore`, deploy folder).

### 1.5 Storage and third-party noise (console: "Tracking Prevention blocked access to storage")
- The "Tracking Prevention blocked access to storage" messages are logged by Edge for **third-party origins**. The editor loads third-party scripts/styles: Google Tag Manager, `cdn.jsdelivr.net` (MathJax), Google Fonts. (I could not verify which origin triggers each line; fix them all by removing the dependency.)
- Independently, the code calls `localStorage` **unguarded in ~25 places** (`initScrollMode`, `setupSidebarResizing`, `initFonts` with `JSON.parse(localStorage.getItem(...))`, projects, calibration…). In privacy modes / blocked-storage situations `localStorage` access can throw `SecurityError` and abort initialisation.
- `VM113: onConsent fired!` comes from the **cookie-consent banner** script, not an editor error. Leave consent logic alone, but the editor page must not depend on it.

### 1.6 Fonts: "there are no new fonts"
- `editor-fonts.js` has a registry of ~45 font names, but:
  - Fonts are loaded at runtime by injecting a `<link>` to `fonts.googleapis.com`, then `await document.fonts.ready`. **`document.fonts.ready` resolves immediately and does not wait for a stylesheet that was just injected**, so text is often rendered in the fallback font. Google Fonts may also be blocked or offline.
  - **No font binary is ever available to the app**, so **text cannot be converted to real outlines** (needed for laser cutting) and the preview is unreliable.
  - The "Hershey" single-line fonts have only a family name, **no glyph data at all**; they cannot work.
  - The picker is a native `<select>` with `<optgroup>` – it cannot show each font in its own typeface or be searched.

**Verdict: replace the font system** (section 8).

### 1.7 Visual design is outdated and inconsistent (symptom: "still looks outrageous")
- `editor.css` is ~1965 lines with **235 hard-coded colours** and `editor.html` has **34 inline `style="…"` attributes**. The light theme is a block of `body[data-theme="light"] …` overrides appended at the end of the file (line ≈1829+): half the UI ignores it.
- The theme toggle is an **inline-styled emoji button (🌙) floating absolutely** (`position:absolute; top:5px; right:20px`) beside the laser toggle. The laser toggle is a `<div class="toggle-switch">`, not an accessible control.
- Left sidebar: tool rows have the shortcut letter (`V`, `R`, `C`…) as a stray text node next to the label; headings wrap; a floating text input; the layout breaks with long labels.
- Mixed units and sizes, no spacing system, modals styled inline.

**Verdict: new design system with tokens** (section 9).

### 1.8 Other defects found
- **Trace Image** (`editor-trace.js`) is not tracing: it emits one `<rect>`-like run per pixel row (`M x y H … V … Z`), i.e. a pixelated block mosaic with thousands of subpaths, limited to 300 px. Replace with a real tracer (section 7.5).
- **Code editor** parses user text with `innerHTML` (`<svg>${rawCode}</svg>`) → **XSS risk** (`<img onerror=…>`). Same risk in any SVG import. Sanitise everything (DOMPurify, vendored).
- `alert()` and `document.execCommand('copy')` used for feedback/clipboard. Use toasts and `navigator.clipboard`.
- Pasted elements offset by `20 * (1 / zoomLevel)` – uses the wrong zoom value.
- Internal unit is "px at 96 dpi" with UI unit factors (mm = 3.7795…): rounding errors and confusing math everywhere. Use **mm as the world unit**.
- Grid min/max clamping (10–500) is applied to world units, not to screen pixels, so grid density jumps unpredictably.

---

## 2. Decisions (do this unless you find a better option and document it)

| Topic | Decision |
|---|---|
| Hosting | Must still deploy as **static files** to the current host. No server code. |
| Module system | **Native ES modules** (`<script type="module">`), no bundler required. If you introduce Vite, you must commit the built output so the existing deploy works. |
| Dependencies | **All third-party code is vendored** into `/vendor/` with pinned versions and licences. **No CDN calls at runtime**, no Google Fonts, no MathJax from jsDelivr. |
| Analytics / GTM | Do **not** load Google Tag Manager inside the editor page. (Site-wide consent/analytics can stay on the other pages.) |
| World unit | **millimetres (float)**. Px/in/cm are display conversions only. |
| Rendering | SVG scene for artwork + **separate screen-space overlay** for UI. Canvas/WebGL only if you prove SVG too slow. |
| State | **One immutable-style document model** + command-based history. DOM is *derived*, never the source of truth. |
| Storage | Single `storage.js` wrapper with try/catch + in-memory fallback. Never call `localStorage` directly anywhere else. IndexedDB for projects/autosave. |
| Geometry libs | Vendored, well-known: **Clipper2 (WASM or JS port) for booleans/offsets**, **opentype.js** for text→paths, **DOMPurify** for sanitising, **KaTeX or MathJax (self-hosted)** for LaTeX, **imagetracerjs or a potrace port** for tracing. |

---

## 3. Contracts that must survive (do not break the rest of the site)

1. **URL/paths:** the editor stays at `/editor` (and works at `/editor/`). Use **absolute paths** (`/editor/js/...`) for assets so trailing slashes can never break loading.
2. **Dashboard integration:** the editor reads projects from `localStorage['vc_projects']` (array of `{id, name, content, ...}`) when opened with `?pid=<id>` (`loadSVGContent(project.content, 'replace')`), and `File → Save to Dashboard` writes to the same key. Keep this format readable and writable (through the storage wrapper), and keep loading SVG strings from it. Migration to IndexedDB is allowed only if the dashboard page is updated accordingly (read the dashboard code first).
3. **Existing icons** in `/sidebar/*.svg` may be reused but a consistent icon set (e.g. a vendored Lucide/Tabler SVG sprite) is preferred.
4. **Templates** (`leather_badge.svg`, `5_star.svg`, `6_star.svg`, `code.svg`, `ellipse.svg`) must still open from the template library.
5. Credits text ("Thank you Martina :)") in About stays.

---

## 4. New core architecture (replaces 1.3 and 1.4)

### 4.1 Folder structure (target)
```
/editor/
  index.html                 (or editor.html – keep the public URL working)
  css/ tokens.css  base.css  layout.css  components.css  themes.css
  js/
    main.js                  entry: boots modules, shows errors visibly
    core/   store.js  commands.js  history.js  ids.js  events.js  storage.js  log.js
    model/  document.js  elements.js  matrix.js  bounds.js  units.js
    view/   camera.js  scene.js  overlay.js  grid.js  rulers.js  input.js  cursors.js
    tools/  select.js pan.js rect.js ellipse.js polygon.js star.js line.js pen.js node.js text.js ...
    ops/    boolean.js offset.js repeat.js round-corners.js dashes.js text-ops.js weld.js ...
    io/     svg-import.js svg-export.js dxf.js pdf.js png.js project.js
    laser/  operations.js bed.js ordering.js checks.js export.js panel.js
    ui/     menubar.js sidebar.js properties.js elements-tree.js modals.js toasts.js font-picker.js shortcuts.js command-palette.js theme.js
/vendor/    (pinned, with LICENSES.md)
/fonts/     (self-hosted .ttf/.woff + fonts.json manifest)
/tests/     svg/ (import fixtures)   e2e/ (browser checks)
/docs/      PLAN.md ARCHITECTURE.md FEATURE_MATRIX.md AUDIT.md
```
Each module exports functions/classes; **no prototype monkey-patching, no globals** except one `window.vc` debug handle.

### 4.2 Document model
Plain JSON, serialisable, versioned:
```js
doc = {
  version: 1,
  units: 'mm',
  settings: { grid: {...}, snap: {...}, laserMode: false, bed: {w:600,h:300} },
  components: { [id]: { id, name, rootIds:[...] } },
  elements:   { [id]: Element },   // flat map
  order:      [ids...],            // z-order of top level (or per parent)
  selection:  [ids...]             // UI state, separate from document data
}
Element = {
  id, type: 'rect|ellipse|path|polygon|star|line|text|group|image|instance',
  name, visible, locked, parent,
  transform: [a,b,c,d,e,f],       // 2D affine matrix in mm
  geometry:  { ... type specific, e.g. path: commands[] },
  style:     { fill, stroke, strokeWidth, ... },
  laser:     { op: 'cut'|'score'|'engrave'|'guide' },
  params:    { ... }              // parametric values/expressions (components)
}
```
- **Stable IDs** (`crypto.randomUUID()` or short ids). Selection is a list of IDs, never DOM nodes.
- Width/height/rotation shown in the properties panel are **computed from geometry + transform** (oriented bounding box), so they are right for rotated and grouped elements.

### 4.3 Store, commands, history
- `store.dispatch(command)` is the **only** way to change the document. A command has `do(doc)` / `undo(doc)` or returns an inverse patch (Immer-style patches or structural-sharing snapshots are both fine).
- Gestures (drag, resize, rotate, slider scrubbing) create **one history entry on pointer-up** (coalescing), preview changes in between without polluting history.
- Subscribers (renderer, elements tree, properties panel, status bar) receive `{changedIds, selectionChanged}` events and **re-render only what changed**.
- History limit ≥ 200 entries; memory-safe.
- Unit tests for: add, delete, duplicate, group/ungroup, reorder, undo, redo, import, coalescing.

### 4.4 Renderer
- `scene.js` maps model → SVG nodes **incrementally** (keyed by id), inside one `<g id="world">`.
- No selection styles, no editor-only attributes in the scene. Exported SVG = a pure function of the model (`svg-export.js`), never a DOM clone.

---

## 5. Camera, zoom, pan, grid (replaces 1.1) – implement exactly like this

### 5.1 Principles
- **Do not use `viewBox` for zooming.** The artwork SVG has `width=100%`, `height=100%` and **no viewBox**. All content sits in `<g id="world" transform="matrix(s 0 0 s tx ty)">`. This removes aspect-ratio/letterbox problems entirely.
- Camera state: `{ x, y, scale }` where `scale` = **screen pixels per mm** and `(x, y)` = world coordinate at the viewport's top-left corner.
- All pointer coordinates are first converted to **viewport-local pixels** with `getBoundingClientRect()` of the canvas element, then to world coordinates by the camera.

```js
// view/camera.js (reference implementation)
export class Camera {
  constructor(){ this.x=-150; this.y=-100; this.scale=3.7795; this.min=0.02; this.max=400; }
  toWorld(sx, sy){ return { x: this.x + sx/this.scale, y: this.y + sy/this.scale }; }
  toScreen(wx, wy){ return { x: (wx-this.x)*this.scale, y: (wy-this.y)*this.scale }; }
  zoomAt(sx, sy, factor){                      // sx,sy: viewport-local px
    const w = this.toWorld(sx, sy);            // world point under cursor BEFORE
    const s = Math.min(this.max, Math.max(this.min, this.scale*factor));
    this.scale = s;
    this.x = w.x - sx/s;                       // keep that point under the cursor AFTER
    this.y = w.y - sy/s;
  }
  panBy(dxPx, dyPx){ this.x -= dxPx/this.scale; this.y -= dyPx/this.scale; }
  matrix(){ return `matrix(${this.scale} 0 0 ${this.scale} ${-this.x*this.scale} ${-this.y*this.scale})`; }
}
```
- **Resize behaviour:** when the viewport size changes (sidebar drag, window resize), **do not change the scale**; keep the world point at the viewport centre fixed, or simply keep `(x, y)` (top-left anchor) – pick one and apply consistently.
- **Initial state:** defined by one function `resetView()` (e.g. show a 300 × 200 mm area centred, with a sensible scale). The very first wheel zoom must use the same code path as every later zoom.
- Render with `requestAnimationFrame`: apply wheel input to the camera immediately, redraw once per frame.

### 5.2 Input mapping
- `wheel` listener with `{passive:false}`. Normalise `deltaMode` (lines ×16, pages ×viewport).
- `ctrlKey` wheel (also what browsers emit for **trackpad pinch**) → zoom with `factor = 2 ** (-deltaY * 0.01)` (clamped per event).
- Two modes in **View menu** and Settings, persisted: **Trackpad** (wheel = pan both axes, Ctrl/pinch = zoom, Shift+wheel = horizontal) and **Mouse** (wheel = zoom at cursor, Shift = horizontal pan, Alt = vertical pan). Horizontal scrolling must **never zoom**.
- Auto-detect only to pre-select a default (large integer line-mode deltas = mouse); the user's explicit choice always wins and is shown in the status bar.
- Middle-mouse / Space+drag / Pan tool → pan. Touch: one-finger pan in Pan mode, two-finger pinch zoom + pan.
- Keyboard: `+`/`-` zoom around the viewport centre, `Ctrl+0` real size, `Ctrl+Shift+F` fit all, `Ctrl+F` fit selection, `0`/Reset = default view.
- Real size uses the calibration value (`dpmm`) from the storage wrapper; default 96 dpi.

### 5.3 Grid and rulers (no per-frame DOM rebuilds)
- Draw the grid in a **`<canvas>` behind the SVG** (or a single `<pattern>` whose transform follows the camera). Never create hundreds of `<line>` elements per frame.
- **Adaptive spacing based on screen pixels:** pick the world spacing from the set `{1, 2, 5} × 10ⁿ mm` so that minor lines are ~8–16 px apart on screen and major lines every 5 or 10 minors. Labels are drawn in screen space at constant font size.
- Axes through (0,0) and **rulers** (top and left, with unit ticks and draggable guides) are drawn in screen space too.
- Grid, rulers and axes use the theme tokens (section 9) so they work in light and dark mode.

### 5.4 Acceptance tests (must pass in the browser)
1. Fresh load. Put the mouse on a distinctive point (e.g. a rectangle corner). Wheel-zoom in 10 steps and out 10 steps: **the point stays under the cursor within 1 px**.
2. Same test with the mouse in each corner and the centre of the canvas, **including the very first zoom after load**.
3. Collapse/expand the sidebar and resize the window: object screen size does not change; no jump.
4. Zoom to min and max limits: no NaN, no blank canvas, grid stays readable.
5. Trackpad mode: horizontal wheel moves horizontally and vertical wheel moves vertically; neither zooms.
6. Performance: zooming with 2000 path nodes on screen stays ≥ 50 fps (check with the Performance panel).

---

## 6. Selection, handles, cursors, snapping (replaces 1.2)

### 6.1 Rules
- The scene contains **no selection styles**. No `style.outline`, no dashed outlines, no handle elements inside the world group.

### 6.2 Overlay layer
- A second `<svg id="overlay">` (or `<canvas>`) **above** the scene, same size, `pointer-events: none` except for the handles, **in screen pixels**, redrawn on camera change or selection change.
- Draw: oriented bounding box (1 px line), 8 resize handles (9 px squares), rotation handle (offset 24 px outside), centre pivot, node points and bezier handles in the node tool, snap guides, measurement labels (e.g. "40.0 mm"), rubber-band selection rect, hover highlight.
- Compute the box from the **selection's oriented bounds in world space**, transform the four corners with `camera.toScreen`, and place the handles on the rotated box. Handle size, line widths and hit areas are **constant in pixels at every zoom level**.
- Hit-testing for handles is done in screen space (≥ 12 px hit area; larger on touch).

### 6.3 Resize/rotate cursors that follow the rotation
- Every handle has a base direction angle (e.g. `e = 0°, se = 45°, s = 90°, …`). The cursor angle = `baseAngle + elementRotation (+ flip adjustment)`.
- Generate the cursor as an **SVG data-URI** (double-headed arrow rotated by the angle) rounded to 15° steps, cache by angle, apply via `style.cursor = url(...) 12 12, auto`. Do the same for the rotate cursor.
- Test with: rect rotated 30°/90°/135°, flipped element, rotated group, rotated text, nested groups.

### 6.4 Interaction quality
- Shift = proportional resize / 15° rotate steps / axis lock; Alt = resize from centre; Ctrl = disable snapping.
- Resizing a **rotated** element must keep the opposite handle fixed and work in the element's local axes.
- Multi-selection resize/rotate transforms the group box; selection survives undo/redo (IDs).
- Snap: grid, geometry (endpoints, midpoints, centres, intersections), guides and other objects' bounding boxes, with visible snap indicators; toggle in toolbar and View menu.
- Context menu on right-click; arrow-key nudging (Shift = 10×).

---

## 7. Feature work (implement, orientation = Cuttle.xyz)

**Rule:** every menu entry visible today must either be **verified working** or removed until it is implemented. Existing menu entries (from the live page) that need a real, tested implementation:

### 7.1 Edit menu
Undo, Redo, Cut, Copy, Paste (paste at cursor/offset in screen pixels converted to world), Select All, Clear Selection, Duplicate, Delete, Group/Ungroup, Bring to Front/Back (+ Forward/Backward), Convert to Paths, Simplify Paths, Extract as Component, Trace Image. Add: Align (L/C/R/T/M/B), Distribute, Flip H/V, Lock/Hide.

### 7.2 Modify menu (current list on the live page)
Rotate, Scale, Flip H/V, **Boolean Union/Difference/Intersect/Exclude**, **Kerf Offset (Inset/Outset)**, Outline Stroke, Merge Paths, Remove Holes, Round Corners (Fillet), Chamfer, Weld & Score, Fit Within Shape, Linear/Rotational/Grid-Tile/Mirror Repeat, Dashed Lines (Perforation), Sheet Nesting, Layered Stack, Flatten, Text Along Path, Text Within Box, Attach to Anchor.
- Build booleans/offsets on **Clipper2** (curves flattened with tolerance, then re-fitted or kept as polylines with a quality setting). Results must be valid closed paths with correct fill rule and keep holes.
- Repeats are **live and parametric** (changing count/spacing updates the result) when applied to a component/group; otherwise they bake.

### 7.3 Drawing tools
Select, Pan, Rectangle (corner radius), Circle, Ellipse, Polygon, Star, Line, Pen/Path (Bezier), Curve/Node edit (move, add, delete, smooth/corner, join/break, close), Freehand, Arc, Text, Emoji/symbols, Shape library ("Browse All Shapes").

### 7.4 Components & parameters (Cuttle's strongest feature)
Reusable components with previews in the sidebar, instances in other components, edit-once-update-all, per-element parameters with simple expressions (`width/2 + thickness`), project variables (material thickness, kerf), collapsible property sections.

### 7.5 Import / export / tracing
- **Import SVG** as native elements (see 10), **DXF**, PNG/JPG (as image or traced), project file (`.vcut` JSON).
- **Export:** SVG (clean, mm units, correct `width`/`height`/`viewBox` in mm), DXF, PDF, PNG, project JSON. Export dialog: selection only, scale, units, stroke/colour mapping, preview.
- **Trace Image:** replace the row-scanning "mosaic" with a real contour tracer (imagetracerjs or potrace-style): threshold/colour modes, curve fitting, speckle removal, corner threshold, preview, runs in a **Web Worker** so the UI never freezes, supports up to ~4000 px.
- **Code view:** read-only "View Source" shows the export; "Edit SVG Code" parses with DOMParser **after sanitising with DOMPurify**, converts through the same import pipeline (so it becomes model elements), and never uses `innerHTML` on user text.

### 7.6 Later (design the model so these fit, do not build now)
CNC (tool/depth/pass parameters per operation, G-code), 3D printing (extrude 2D to STL/3MF), nesting improvements.

---

## 8. Fonts and text (replaces 1.6)

### 8.1 Self-hosted font system
- Put font files in `/fonts/` (**TTF/OTF or WOFF**; opentype.js cannot read WOFF2) with a generated `fonts.json` manifest: `id, family, category, style(s), file(s), license, source, singleLine`.
- Declare all fonts with `@font-face` (`font-display: swap`) generated from the manifest. **No Google Fonts links at runtime.**
- Obtain files from open-licence sources (e.g. the `@fontsource/*` npm packages or the Google Fonts repository) and list every font with its licence in `LICENSES.md`. **Only OFL/Apache/public-domain fonts.**
- Target: **at least 120 fonts**: sans, serif, slab, display, handwriting/script (include the existing ones such as Hurricane, Pacifico, Dancing Script, Great Vibes, Alex Brush, Allura, Sacramento, Satisfy, Caveat), monospace, **stencil**, **rounded**, **blackletter**, **pixel/tech**, plus the existing registry.
- **Loading:** use `new FontFace(name, url).load()` and `document.fonts.add()`, and **await the specific face** (`document.fonts.load('16px "Name"')`) before measuring or converting. Lazy-load only the fonts that are used or previewed.
- User font upload (TTF/OTF/WOFF) stays and is stored in IndexedDB so it survives reload.

### 8.2 Hershey / single-line fonts
- Get a **public-domain Hershey dataset** (JSON glyph polylines), convert it into `fonts/hershey/*.json`, and write a small renderer that outputs **open stroke paths**. Without the glyph data, remove these fonts from the picker. Single-line text is for **scoring/engraving**, so it must produce open paths and no fill.

### 8.3 Font picker
- Custom dropdown/popover (not `<select>`): search field, categories, favourites, recents, **each name rendered in its own typeface**, keyboard navigation, virtualised list (≥ 120 entries stay smooth), "Upload font…" at the top.

### 8.4 Text element behaviour
- Properties: text content (multi-line), font, size (pt/mm), align, vertical align, letter spacing, line height, bold/italic if available, **welding** (none/union overlapping glyphs – important for script fonts), outline-only option.
- **Convert to Paths** uses opentype.js to produce exact outlines (kerning and ligatures included) so exports and laser operations are correct.
- **LaTeX text:** when an element is LaTeX, **hide irrelevant font settings** and render through the self-hosted KaTeX/MathJax → SVG paths.
- Text Along Path and Text Within Box are real features, not stubs.
- Left sidebar must show text elements correctly (see 9.4).

---

## 9. UI / design system (replaces 1.7)

### 9.1 Tokens
- Create `tokens.css` with CSS variables for **everything**: `--bg`, `--surface-1/2/3`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-contrast`, `--danger`, `--canvas-bg`, `--grid-minor`, `--grid-major`, `--selection`, `--handle-fill`, `--handle-stroke`, radii, spacing scale (4/8/12/16/24), type scale, shadows, z-index scale.
- **Zero hard-coded colours** in component CSS, **zero inline `style=""`** in the HTML (except dynamic values set by JS). Remove the 235 hard-coded colours and 34 inline styles.
- Themes: `:root` = light, `:root[data-theme="dark"]` = dark, `auto` follows `prefers-color-scheme`. Delete the appended `body[data-theme="light"]` override block entirely.

### 9.2 Theme switch (currently just an emoji next to the laser button)
- **Appearance** setting in *Settings → Appearance* with **Light / Dark / System** (persisted, applied before first paint to avoid flash).
- Top bar gets a compact **theme icon button** (sun/moon/monitor) that opens a small menu with the three options – visually part of the top-bar toolbar, not an absolutely positioned stray element.
- Contrast ≥ WCAG AA in both themes; canvas, rulers, grid, handles, menus, dialogs, tooltips, sidebar, properties panel are all themed. Laser operation colours (cut/score/engrave) do **not** change with the theme.

### 9.3 Top bar & layout
- One CSS-grid app shell: **menu bar** (File, Edit, Modify, View, Settings, Help) · **project name (editable)** · right cluster: **Laser Mode** (proper `<button role="switch">`), theme button, Share/Export. Below: **tool/canvas bar** (Select, Pan, Grid, Snap, Zoom controls, units). Then **left sidebar | canvas | right panel**. Bottom **status bar**.
- Floating **quick-tools bar** over the canvas for the selection (rotate 90°, flip, duplicate, group, align, delete, "Convert to paths") – like Cuttle.
- Menus: keyboard accessible, close on Esc/outside click, show real shortcuts right-aligned, disabled state when not applicable (e.g. Ungroup with no group).
- Command palette (`Ctrl+K`) lists **only commands that exist**.
- Replace `alert/prompt/confirm` with in-app dialogs and toasts.

### 9.4 Left sidebar (rebuild)
- Layout: header (search + collapse), then sections **Tools/Shapes**, **Components**, **Project**, **Developer** as accordions. Each tool row = fixed-size icon column + label (ellipsis) + right-aligned muted shortcut (`kbd`). No wrapping, no overlapping.
- Works in **three states**: expanded, resizable (drag handle, min/max, persisted), icon-only (tooltips).
- Search filters tools and shapes live; clearing restores state.
- Components list shows live previews and the add button, never clipped.
- Text/element rows in the **Elements list**: icon, name, text preview (single line, ellipsis), visibility and lock toggles, drag-to-reorder, rename on double-click, selection synced with the canvas by ID.

### 9.5 Properties panel
- Sections: Transform (X, Y, W, H, rotation, lock ratio), Appearance (fill, stroke, width, dash), Text, Laser operation, Parameters. Multi-selection shows shared values and a "mixed" state.
- Numeric inputs: scrub-drag labels, arrow keys, units suffix, Enter to commit, Esc to revert, math expressions allowed.
- Right panel resizable and collapsible (already present, rebuild with the new components).

### 9.6 Responsiveness
Desktop first. At < 1000 px the right panel becomes a drawer; at < 700 px the sidebar becomes icon-only and menus collapse into a hamburger. No horizontal page scroll at any width.

---

## 10. SVG import pipeline (needed for Laser Mode compatibility)

Pipeline: `text → DOMPurify.sanitize → DOMParser → mount in an off-screen hidden <svg> in the real DOM → walk nodes using getCTM()/getBBox()/getComputedStyle() → model elements`.
- Support: `path, rect, circle, ellipse, line, polyline, polygon, g, use, text/tspan, image, defs, clipPath, mask (simple), symbol`, nested `transform`s (flatten to matrices), `viewBox` + `preserveAspectRatio`, units (`px, pt, pc, mm, cm, in, %`) with a **dpi selector in the import dialog** (96 default; hints for Inkscape 90 dpi / Illustrator 72 dpi), CSS classes and `<style>` blocks (via computed style), `fill-rule`, `stroke-dasharray`.
- **Never** keep an imported file as an opaque blob or `<image>` (the black block seen in the editor after import). If something is unsupported, report it in an **import log** dialog and import the rest.
- Import dialog: scale, dpi, "interpret colours as" mapping table (e.g. red → Cut, blue → Score, black → Engrave), "convert text to paths", "ungroup".
- Fixtures in `/tests/svg/`: Inkscape, Illustrator, Figma, Cuttle export, Fusion/AutoCAD DXF-converted, a file with CSS classes, one with nested transforms/`use`, one with embedded raster. All must import correctly.

---

## 11. Laser Cutting Mode (the toggle is currently cosmetic)

The current "mode" only recolours fill/stroke (see `insertTracedPath`: `fill: laserMode ? 'none' : '#333'`). Make it a real feature (first read `editor-laser-mode.js` and `editor-production.js`, then replace what does not meet this):

- **Operations per element:** `cut`, `score`, `engrave`, `guide` (stored in `element.laser.op`), assignable in the properties panel and by **colour mapping rules** (editable table, persisted).
- **Display when ON:** hairline strokes (1 px, screen-space) in the operation colours, engrave areas hatched/shaded, guides greyed. When OFF: normal design view. Toggle is an accessible switch with a visible state in the status bar and a **Laser panel** (right panel tab).
- **Bed/material:** sheet presets + custom size, thickness, kerf (offset), origin, visible bed boundary, warning for out-of-bed elements.
- **Checks panel:** open paths that should be closed, duplicate/overlapping lines, tiny segments, self-intersections, text not converted to paths, elements outside the bed. Each check selects the offending elements on click.
- **Cut ordering:** inner before outer, nearest-neighbour, start-point choice, minimise travel; preview animation optional.
- **Export for lasers:** SVG with operation colours and exact mm size, DXF (layers per operation), PDF. Verify by re-importing the export and checking dimensions.
- Laser mode and operation data are saved in the project file and survive undo/redo.

---

## 12. Milestones with acceptance checks

Commit after each milestone; run the checks in the Antigravity browser and attach screenshots to `docs/AUDIT.md`.

**M0 – Audit & plan (no code changes yet)**
- Read every file listed in 0.3 (including those not seen). Verify that every `<script src>` in `editor.html` exists on disk **and** in the deployed site (reproduce the `editor-qol.js` 404).
- Generate `docs/FEATURE_MATRIX.md`: for **every** element id in the HTML menu/toolbars/sidebar, record: handler exists? works? Test by clicking.
- Write `docs/PLAN.md`: what to keep, what to delete.
- ✅ Check: a table of all menu items with status (works / broken / stub).

**M1 – Foundation**
- New app shell, ES modules, `storage.js`, `log.js` (errors visible in a dev overlay), vendored libs, **no third-party runtime requests** (check the Network tab: only same-origin).
- ✅ Check: page loads with **zero console errors/warnings**, no GTM/jsDelivr/Google Fonts requests, works with storage blocked (simulate by throwing in `storage.js`).

**M2 – Model, store, history, renderer**
- ✅ Check: unit tests (section 4.3) pass; create/duplicate/delete/group/undo/redo 50 times – element list, canvas and properties always agree.

**M3 – Camera, grid, rulers, input**
- ✅ Check: all tests in 5.4.

**M4 – Selection overlay, handles, cursors, snapping**
- ✅ Check: handles stay 9 px at 10 %–4000 % zoom; cursors point correctly at 30°/90°/135°; rotated resize works; list selection syncs.

**M5 – UI system: tokens, themes, top bar, sidebar, properties, elements tree**
- ✅ Check: light/dark/system switch with no unthemed regions (screenshot each panel in both themes); sidebar with long names and text elements has no overlap in expanded/narrow/icon-only; theme control lives in the top bar and Settings.

**M6 – Drawing tools + node editing + text + fonts**
- ✅ Check: ≥ 120 fonts selectable, each preview in its own face; text → paths produces correct outlines; Hershey text exports as open paths; LaTeX works offline.

**M7 – Import/export + tracing + code view**
- ✅ Check: all fixtures in `/tests/svg/` import as editable elements; export at correct mm size; trace of a logo gives smooth curves in < 2 s; `<img onerror>` in the code editor does nothing.

**M8 – Laser mode**
- ✅ Check: section 11 items demonstrated with an imported SVG; checks panel finds a seeded open path and a seeded duplicate line.

**M9 – Modify menu & components & repeats**
- ✅ Check: every Modify item works on a sample set; component edit propagates to instances; repeat count change updates live.

**M10 – Polish, docs, performance, deploy**
- ✅ Check: Lighthouse performance ≥ 80 on desktop, no layout shift, README + ARCHITECTURE + LICENSES done, deployment verified on `vectorcutter.oldlane17.com/editor` (hard refresh, incognito, Edge with Tracking Prevention "Strict").

---

## 13. Hard rules (checklist before saying "done")

- [ ] Zero console errors and warnings on load and during all acceptance checks.
- [ ] Every referenced script/asset exists (no `text/html` MIME errors).
- [ ] Only same-origin requests at runtime (no GTM, CDN, Google Fonts in the editor).
- [ ] No direct `localStorage` calls outside `storage.js`.
- [ ] No selection or UI state in the exported SVG or the model.
- [ ] No hard-coded colours or inline styles in component CSS/HTML.
- [ ] Zoom keeps the cursor point fixed from the very first wheel event.
- [ ] Handles/outlines are constant pixel size; cursors follow rotation.
- [ ] Light, dark and system themes complete; theme control in the top bar and Settings.
- [ ] Every visible menu item works or is hidden; `docs/FEATURE_MATRIX.md` is all green.
- [ ] Imported SVGs are editable native elements and work in Laser Mode.
- [ ] ≥ 120 self-hosted fonts load reliably; text converts to exact paths.
- [ ] Dashboard `?pid=` project loading and "Save to Dashboard" still work.
- [ ] Every claim of "fixed" is backed by a browser test or screenshot in `docs/AUDIT.md`.

**If in doubt: delete the old code, write the small clean version, test it in the browser, and move on.**