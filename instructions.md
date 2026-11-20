# VectorCutter – Implementation Instructions (Revision 2)

**Audience:** Gemini 3.8 Flash (code-generating model).
**Project:** VectorCutter, a browser-based vector editor for laser cutting / engraving (dark UI, left tool list, floating top toolbar, canvas in the middle, PROPERTIES / LASER PREP panel on the right, status bar at the bottom).
**Goal of this revision:** fix one critical rendering bug, restore features that were removed in the last change, fix icon colors, clean up the Properties layout, and add a new "Prepare for 3D" workflow for 3D printing and CNC milling.

Read this entire document before writing any code. Follow it literally. Where it says MUST, MUST NOT, or ACCEPTANCE, treat it as a hard requirement.

---

## 0. Working rules (read first, apply to every section)

1. **Audit before editing.** Before changing anything, read the full current code and write down (as a comment block at the top of your answer, max 25 lines) how the app currently works: how state is stored, how the canvas is drawn (SVG DOM or `<canvas>`), where the right panel is built, where the tool list is built, where the render function is called from.
2. **No regressions.** The last change removed features. This must never happen again. Every feature that exists in the current version and is not explicitly marked "remove" in this document MUST still exist and work after your change. This includes (non-exhaustive): all tools in the left list (Select, Rectangle, Circle, Ellipse, Polygon, Star, Line, Curve/Node, Pen/Path, Text, Browse Shape Library), keyboard shortcuts (V, R, C, L, N, P, T and "/" for search), the floating top toolbar (select, rectangle, circle, polygon, star, curve, pen, undo, redo, rotate 180, mirror, align/distribute, duplicate, delete), the top menu (File, Edit, Modify, View, Help), Laser Mode toggle, dark/light toggle, zoom display, coordinate readout, unit display, the Properties tab and the Laser Prep tab, Transform / Appearance / Laser Operation / Text Properties sections.
3. **Deliver complete files, never fragments.** Output every changed file in full. Do not write "rest unchanged", "...", or "same as before". If the project is a single HTML file, output the whole file.
4. **No new build step.** Plain HTML, CSS, JavaScript (ES2020). Any external library must be loaded from `https://cdnjs.cloudflare.com` or `https://cdn.jsdelivr.net/npm/` with an **exact pinned version** (no `latest`, no ranges). Prefer libraries that work as a plain `<script>` UMD build.
5. **No browser-storage assumptions.** If the app currently uses `localStorage`, wrap every read/write in `try/catch` and make the app work when storage is empty or unavailable.
6. **Single source of truth.** There is exactly one document model (see §1). Canvas, object list, SVG code editor, Properties panel and 3D prep all read from it and write to it through the same functions. No panel may keep its own private copy of shape data.
7. **Self-check at the end.** After the code, output the checklist from §9 with every item marked PASS or FAIL. If an item is FAIL, fix it before answering; do not hand in a known-failing item.
8. **Typography/UX language.** All UI strings in English. Use "mm" as the default unit everywhere.

---

## 1. CRITICAL BUG: canvas does not show live state (updates only on window resize)

### Symptom
Creating, moving, editing or deleting an object does not change the canvas until the browser window is resized.

### Diagnosis you MUST perform
Find out why. The most likely causes, in order:
- The render/draw function is only called from a `resize` handler (or `ResizeObserver`) and not from the mutation paths.
- State is mutated in place and the render call was removed or moved during the last refactor.
- (If `<canvas>` based) the drawing loop never runs, or it draws into a buffer that is only presented on resize.
- (If SVG based) a new element is created but not appended, or attributes are set on a detached/cloned node.

### Required architecture (implement exactly this)
1. **Document model:** one object, e.g. `doc = { objects: [...], selection: [...], view: {zoom, panX, panY}, settings: {...} }`. Each object has a stable unique `id`, a `type` ("rect", "circle", "ellipse", "polygon", "star", "line", "path", "text", "group"), geometry fields, appearance fields, laser fields, and an optional `params` (for generators, §4) and optional `threeD` (for §7).
2. **One mutation gateway:** every change to the model goes through a function `commit(label, mutatorFn)` (or equivalent) which: (a) pushes an undo snapshot, (b) applies the mutation, (c) calls `requestRender()`, (d) emits a `"changed"` event.
3. **Render scheduler:**
   ```js
   let renderQueued = false;
   function requestRender() {
     if (renderQueued) return;
     renderQueued = true;
     requestAnimationFrame(() => { renderQueued = false; renderAll(); });
   }
   function renderAll() { renderCanvas(); renderObjectList(); renderProperties(); syncCodeEditor(); updateStatusBar(); }
   ```
   `renderCanvas()` MUST be pure with respect to the model (reads only). It MUST NOT be coupled to window size.
4. **Live interaction:** during drag, resize, rotate, node editing and slider/input changes in the Properties panel, call `requestRender()` on every `pointermove` / `input` event (not only on `pointerup` / `change`). Use pointer events with `setPointerCapture`.
5. **Resize handling is separate:** a `ResizeObserver` on the canvas container only updates canvas dimensions / viewBox and then calls `requestRender()`. It must not be the *only* trigger.
6. **Initial render:** call `requestRender()` once at startup after the DOM is ready, so the canvas is correct without any resize.
7. **Zoom/pan** must also go through `requestRender()` and update the "Zoom: xx%" display.

### ACCEPTANCE (all must hold, without ever resizing the window)
- Draw a rectangle: it appears while dragging.
- Move it with the mouse: it follows the cursor frame by frame.
- Change X / Y / Width / Height / Rotation in Properties: canvas updates on each keystroke/arrow-key step.
- Change Fill/Stroke/Opacity: updates immediately.
- Edit text content: updates on each keystroke.
- Undo / redo: canvas updates immediately.
- Delete: object disappears immediately.
- Edit SVG code (§3): canvas updates (debounced ≤ 250 ms).

---

## 2. Restore: object list ("Objects" panel) on the right

The right panel previously listed all currently existing elements. This MUST come back and MUST remain.

### Requirements
- Location: right side. Add it as a **collapsible section "OBJECTS"** at the top of the PROPERTIES tab, above TRANSFORM, with a fixed max height (e.g. 180 px, internal scroll) so it never pushes the properties out of view. Also provide a drag handle or a toggle (chevron) to collapse it.
- One row per object, in z-order (top-most object first). Each row: small type icon (white, §5), name (default e.g. "Star 3", editable via double-click), visibility toggle (eye), lock toggle.
- Click selects the object (shift/ctrl-click = multi-select). The selected rows are highlighted, and the selection on the canvas is highlighted at the same time (single source of truth: `doc.selection`).
- Selecting on the canvas highlights and scrolls the corresponding row into view.
- Drag-and-drop reorder of rows changes z-order and re-renders the canvas.
- Hidden objects are not drawn on the canvas and not exported for laser or 3D; locked objects cannot be selected on the canvas but can be selected in the list.
- Right-click context menu on a row: Duplicate, Delete, Bring to front, Send to back, Prepare for 3D.
- The list updates live (via `renderAll`) on every model change.
- Groups are shown as expandable tree nodes.

### ACCEPTANCE
Create 5 mixed objects: the list shows 5 rows with correct icons and names; reorder by drag changes stacking; hide/lock works; selecting in either place selects in both.

---

## 3. Restore: direct SVG code editor (left toolbar button)

### Requirements
- Add a button **"SVG Code"** to the left tool list, directly below "Browse Shape Library" or as the last entry of the tool list (icon: `</>`, white). Shortcut: `Ctrl+Shift+E`. It is a **panel toggle**, not a drawing tool: it must not change the active drawing tool.
- Clicking it switches the right panel into **Code mode**: a third tab "SVG CODE" appears next to PROPERTIES and LASER PREP and becomes active (clicking the button again, or clicking another tab, returns to the previous tab).
- The panel contains:
  - A monospace `<textarea>` (or CodeMirror 5 from cdnjs with pinned version, SVG/XML mode, if you want syntax highlighting; the textarea is acceptable) with line numbers if CodeMirror is used. Full panel height, resizable. Tab key inserts two spaces.
  - A status line: "Valid SVG" (green) or the parse error with line/column (red).
  - Buttons: **Apply** (manual), **Revert**, **Copy**, **Format**, and a checkbox **Live apply** (default ON).
  - Scope selector: **Whole drawing** | **Selection only**.
- **Model → Code (view):** serialize the current document to clean, indented SVG. Units in mm: `<svg xmlns="http://www.w3.org/2000/svg" width="…mm" height="…mm" viewBox="…">`. Each object gets `id`, and generator objects keep `data-vc-*` attributes for their params (§4) and `data-vc-3d` for 3D settings (§7) so a round trip loses nothing. Editor refreshes when the model changes **unless** the code editor currently has focus and unapplied edits (then show an "out of sync" badge).
- **Code → Model (edit):** parse with `DOMParser` (`image/svg+xml`). If `parsererror` exists, do **not** touch the model; show the error. If valid, translate into the document model (rect, circle, ellipse, polygon, polyline, line, path, text, g; support `transform` attributes by baking or by storing a matrix; unknown elements are preserved in a "raw" object type and rendered as-is). Wrap this in `commit("Edit SVG code", …)` so it is one undo step. Debounce live apply by 250 ms.
- Sanitize: strip `<script>`, event-handler attributes (`on*`), `javascript:` URLs and `<foreignObject>` before applying.
- Caret/selection sync (nice to have): clicking an object selects its element in the code editor and vice versa.

### ACCEPTANCE
Draw a star, open SVG Code: its markup is visible. Change a `fill` value in the code: the canvas changes within 250 ms. Type invalid markup: red error, canvas unchanged. Undo reverts the code edit as one step.

---

## 4. Restore: smart generators for Star and N-gon (Polygon)

Both tools used to have parametric ("smart") generation. Bring them back and make them **non-destructive**: the object keeps its `params` so it can be re-parameterized at any time while it stays a polygon/path object.

### 4.1 Star generator
Parameters (stored in `obj.params`, mirrored as `data-vc-*` attributes in SVG):
| Param | Meaning | Range | Default |
|---|---|---|---|
| `points` | number of tips n | 3 – 64 | 5 |
| `outerRadius` | R in mm | > 0 | derived from drag |
| `innerRatio` | k = innerRadius / R | 0.05 – 0.95 | 0.382 |
| `rotation` | degrees | -360 – 360 | 0 (tip points up) |
| `cornerRadius` | rounding of vertices in mm (optional) | 0 – R/2 | 0 |

Vertex math (center cx, cy; SVG y axis points down, tip up means angle start −90°):
```
for i in 0 .. 2n-1:
  r     = (i % 2 === 0) ? R : k*R
  theta = rotationRad - Math.PI/2 + i * Math.PI / n
  x_i   = cx + r*cos(theta)
  y_i   = cy + r*sin(theta)
```
Close the polygon. If `cornerRadius > 0`, replace each vertex by a quadratic or arc fillet, clamped so that the radius never exceeds half the adjacent edge length.

### 4.2 N-gon (Polygon) generator
| Param | Meaning | Range | Default |
|---|---|---|---|
| `sides` | n | 3 – 128 | 6 |
| `radius` | circumradius R | > 0 | from drag |
| `sizeMode` | "circumradius" \| "inradius" \| "sideLength" | enum | circumradius |
| `rotation` | degrees | -360 – 360 | 0 |
| `cornerRadius` | mm | 0 – … | 0 |

Vertices: `theta = rotationRad - π/2 + 2π·i/n`, `x = cx + R·cos(theta)`, `y = cy + R·sin(theta)`. Conversions: `inradius = R·cos(π/n)`, `sideLength = 2R·sin(π/n)`.

### 4.3 UI behavior
- **While the tool is active** (before drawing), show a slim options bar under the floating toolbar (or at the top of the Properties panel) with the generator fields (`points`/`sides`, `innerRatio`, `rotation`, `cornerRadius`). Values persist for the next object.
- **Drawing:** pointer-down sets the center, drag sets R and rotation (hold Shift to snap rotation to 15° steps, Alt = draw from corner instead of center is optional). Live preview while dragging.
- **After creation / on selection:** the Properties panel shows a **"SHAPE GENERATOR"** section (placed directly below TRANSFORM) with the same fields as editable inputs and sliders. Every change re-generates the vertex list via `commit` + `requestRender()` with live preview.
- **Breaking the link:** if the user edits nodes (Curve/Node tool) the object is converted to a plain path and `params` is dropped; show a one-line notice "Converted to path" (non-blocking).
- Scale/resize via Transform keeps `params` consistent (update `outerRadius`; non-uniform scale converts to path).

### ACCEPTANCE
Draw a star with 7 tips. Change tips to 5, ratio to 0.5, rotation to 36 via Properties: live update, no resize needed. Draw a hexagon, switch sizeMode to sideLength and enter 20: sides measure 20.0 mm. Reload via SVG code round-trip: generator params survive.

---

## 5. Icons: all icons MUST be white

### Problem
The Ellipse, Polygon and Star icons are rendered black (they use a hard-coded `stroke`/`fill` such as `black`, a default SVG fill, or an inline style that overrides CSS).

### Fix
1. Find **every** icon in the app (left tool list, floating toolbar, object list rows, menus, tabs, buttons, 3D prep). Search the code for `fill="black"`, `fill="#000"`, `stroke="black"`, missing `fill` attributes on `<path>` / `<polygon>` / `<ellipse>`, and inline `style="…"`.
2. Define a single CSS variable on `:root`: `--icon-color: #ffffff;`.
3. Make all icons inherit it: remove hard-coded colors from the icon SVG markup and use
   ```css
   .icon, .icon * { color: var(--icon-color); }
   .icon svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
   .icon svg [fill="none"] { fill: none; }
   ```
   For filled glyphs (e.g. the dot in a radio), explicitly use `fill: currentColor`. If an icon is an `<img src="*.svg">`, inline it instead (an `<img>` cannot inherit `currentColor`) or apply `filter: invert(1)` only as a last resort.
4. The active tool row (e.g. "Text" highlighted blue) keeps white icons.
5. If a light theme exists (moon toggle at the top), the tool list and toolbars MUST keep a dark background in that theme so white icons remain visible; do not switch icons to black.

### ACCEPTANCE
Visually check every icon in dark and light theme: all pure white, including Ellipse, Polygon and Star, hover and active states.

---

## 6. Properties panel: alignment and layout

### Problems visible in the current UI
- The unit labels ("mm", "°") are clipped at the right edge and overlap the scrollbar.
- Input boxes have different widths and x-positions per row (X/Y vs Width/Height vs Rotation vs Font Size), so the column looks ragged.
- The Fill / Stroke swatches, the "None" labels, the opacity slider and the dropdowns (Mode, Font Family) are not on a common grid.

### Required layout (implement with CSS Grid, no absolute positioning, no magic margins)
Every property row uses the same three-column grid:
```css
.prop-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) 32px; /* label | control | unit */
  align-items: center;
  column-gap: 8px;
  min-height: 32px;
  padding: 2px 12px;
}
.prop-row > label { color: var(--text-dim); text-align: left; white-space: nowrap; }
.prop-row > .control { width: 100%; min-width: 0; }
.prop-row > .unit { text-align: left; color: var(--text-dim); font-size: 12px; }
.prop-row input[type=number], .prop-row input[type=text], .prop-row select {
  width: 100%; box-sizing: border-box; height: 28px; text-align: right; padding: 0 8px;
}
.prop-row select { text-align: left; }
```
Rules:
1. **All controls in the middle column have identical width and left/right edges** (inputs, selects, color swatches, slider, text field).
2. The unit is always in the third column (empty cell if there is no unit, so alignment never shifts). Use "mm" and "°" only there.
3. Fill and Stroke rows: swatch in the control column (full width, same height 28 px), the "None" toggle moves into the third column as a small checkbox/toggle labelled with a tooltip, or into its own row below. It MUST NOT overflow.
4. Opacity: slider fills the control column, numeric value (e.g. "100") in the third column.
5. Section headers (TRANSFORM, APPEARANCE, LASER OPERATION, TEXT PROPERTIES, SHAPE GENERATOR, OBJECTS) share one style: uppercase 11 px, letter-spacing 0.08em, 16 px top margin, 1 px divider.
6. The panel container: `overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable;` so the scrollbar never overlaps content. Panel width fixed to 340 px minimum (resizable by a drag handle is optional).
7. Number inputs: no native spinners (`appearance: textfield`), but support ArrowUp/ArrowDown (±1, Shift ±10, Alt ±0.1), mouse-wheel adjust only when focused, Enter commits, Escape reverts. Select all text on focus.
8. Dropdowns (`select`) use the same height and border as inputs; the chevron has 8 px right padding.
9. Tab headers "PROPERTIES / LASER PREP / SVG CODE / 3D PREP" are evenly spaced in one row (flex, `flex: 1`) and do not wrap or clip at 340 px; reduce letter-spacing or abbreviate to "3D" only if it truly does not fit.

### ACCEPTANCE
Zoom the browser to 100 % and 125 %: left edges of all labels line up, all input boxes have the same left and right edge, no text is clipped, no horizontal scrollbar.

---

## 7. NEW FEATURE: "Prepare for 3D" (3D printing and CNC milling)

### 7.1 Concept
The user designs in 2D on the normal canvas (shapes, paths, text). Then the user selects one or more objects and presses **"Prepare for 3D"**. A new right-panel tab **"3D PREP"** opens, where the user chooses *how* the 2D outline becomes a 3D body, sees a live 3D preview, and exports STL / OBJ / CNC files. The 2D drawing is never modified by this; the 3D settings are stored per object in `obj.threeD` (non-destructive).

### 7.2 Entry points (all must exist)
- A button **"Prepare for 3D"** at the bottom of the PROPERTIES tab (enabled when ≥ 1 object is selected) and in the object-list context menu and in the menu **Modify → Prepare for 3D…**.
- The top-right "Laser Mode" toggle stays unchanged. Add a sibling toggle or the tab itself; do not break Laser Mode.
- Shortcut: `Ctrl+Shift+3`.

### 7.3 Input geometry pipeline (2D → clean polygons)
1. **Flatten** every selected object to closed polylines in mm:
   - rect, circle, ellipse, polygon, star → sample directly (circle/ellipse: `segments` per full turn, default 96, adaptive).
   - path / curve → flatten Béziers and arcs with a tolerance of **0.05 mm** (recursive subdivision or fixed step count based on length).
   - **text → outlines**: convert glyphs to paths with **opentype.js** (pinned version, e.g. `opentype.js@1.3.4` from jsDelivr). Load the font file matching the object's Font Family (provide a small built-in map for Roboto and the other fonts offered in the dropdown, fetched as TTF/WOFF from a CDN that is reachable by the app; cache the `ArrayBuffer`). Counters of letters (holes in "O", "A", "B") MUST become holes. If a font fails to load, show a non-blocking warning "Font outlines unavailable – text skipped" and offer "Convert text to path" using the browser's fallback; never crash.
   - Apply object transforms (translate, rotate, scale) so that everything is in document coordinates.
2. **Orient and classify rings:** compute signed area. Outer rings counter-clockwise, holes clockwise (flip as needed). Build containment: a ring inside an odd number of rings is a hole (even-odd), otherwise an outer ring. Support multiple disjoint outer rings.
3. **Clean-up:** remove duplicate consecutive points (epsilon 1e-4 mm), remove zero-area rings, warn on self-intersections (use Clipper union with `NonZero`/`EvenOdd` fill to normalize if available).
4. **Polygon offsetting:** use **Clipper** (`clipper-lib` 6.4.2 via cdnjs/jsDelivr, integer scale 1000 = 1 µm) for true inward/outward offsetting with `jtMiter` (miter limit 2) or `jtRound`. Do not approximate with simple scaling about the centroid except in the explicit "to point" modes where scaling is the correct operation.
5. **Triangulation:** use **earcut** (pinned version, with hole support) for caps. Walls are quads split into two triangles with consistent outward-facing winding.

### 7.4 The 3D modes (user-selectable dropdown / card grid with small preview icons)
Common parameters for all modes (shown as grid rows following §6 layout):
- **Height / thickness** `H` in mm (default 5, range 0.1 – 500).
- **Base thickness** `B` in mm (default 0): a straight-extruded plate underneath the shape (typical for lithophane-like badges or sign letters on a plate; plate outline = outline offset by `Base margin`).
- **Direction:** Up (+Z) | Down (−Z) | Both (symmetric, ±H/2).
- **Segments / quality** (for curves and rounded modes).
- **Units** fixed to mm.

Modes (every mode MUST be implemented and listed in the UI; German terms in brackets only for orientation, UI is English):
1. **Straight extrude** ("senkrecht, n mm dick"): walls vertical, constant outline. Parameter: `H`.
2. **Converging / Taper in** ("zusammenlaufend"): the outline shrinks linearly toward the top. Parameters: `taper` as **angle** (0 – 85°, default 15°) **or** **end scale in %** (0 – 100 %); user switches between the two input kinds; both always stay in sync. Implementation: top ring = inward offset of the bottom ring by `d = H · tan(angle)` using Clipper; if the offset collapses the shape (area → 0) before reaching `H`, **clamp** the height to the collapse height and show an info notice ("Shape closes at 7.4 mm"). Build intermediate rings (`slices`, default 1 for linear walls, more for curved modes) and connect corresponding rings.
3. **Diverging / Flare out** ("auseinanderlaufend"): the outline grows toward the top. Same parameters as Converging but with an outward offset (`d = H · tan(angle)`, angle 0 – 75°, or end scale 100 – 500 %).
4. **To point / Pyramid–Cone** ("läuft spitz zu"): all rings converge to an apex. Parameters: `apex` position (center of mass by default; or custom X/Y offset in mm). Use per-vertex scaling toward the apex; triangulate the walls as a fan per edge. For shapes with holes, holes also converge to the apex, which makes the body non-manifold: in this case show a warning "Holes are closed by cone mode – use Taper with end scale > 0 instead" and fall back to Taper to 1 % end scale.
5. **Chamfer / Bevel** ("angefaste Kante"): vertical walls with a chamfered top (and optionally bottom) edge. Parameters: `chamferSize` (mm), `chamferAngle` (default 45°), `sides` (top | bottom | both).
6. **Rounded / Fillet** ("abgerundete Kante"): like chamfer but with a quarter-circle profile, `radius` (mm), `steps` (4 – 24). Radius is clamped to `min(H, half of the smallest feature width)`.
7. **Stepped / Layered** ("gestuft, Stufen"): `layers` count (2 – 50) and `stepInset` mm per layer, producing terraces (also the direct basis for CNC layer-by-layer cutting).
8. **Twist extrude** ("verdreht"): rotates each slice by `twistAngle` degrees total around the shape centroid (−720 … 720°), `slices` default 64.
9. **Inflate / Pillow** ("aufgeblasen"): height profile `h(d) = H · sqrt(1 − (1 − d/dmax)²)` over distance to the outline (computed by successive inward Clipper offsets in `steps` rings, default 12). Optional; implement after 1–8 work, but it MUST be present in the dropdown (disabled with tooltip "coming soon" only if it truly cannot be completed; prefer implementing it).
10. **Revolve (lathe)** ("Rotationskörper"): treat the selected closed shape as a half-profile around a vertical axis (axis line at the object's left edge or user X in mm), `angle` 1 – 360°, `segments` 8 – 256. Optional, same rule as 9.

For modes 2, 3, 6, 7 the user can additionally choose a **profile curve** (Linear | Ease-in | Ease-out | S-curve) controlling how the offset evolves with height; Linear is default.

### 7.5 Mesh requirements
- Output a **watertight, manifold, consistently oriented** triangle mesh (outward normals, counter-clockwise when viewed from outside). Z is up, units mm.
- Caps are triangulated with holes respected. Straight/tapered walls connect rings vertex-to-vertex; when ring vertex counts differ (after offsetting), re-sample both rings to the same count by arc-length resampling before connecting, or insert extra vertices consistently.
- Compute and display: triangle count, bounding box (W × D × H mm), volume (cm³) and estimated mass for a selectable material density (PLA 1.24, PETG 1.27, ABS 1.04, Resin 1.1, Wood/MDF 0.7, Aluminium 2.7 g/cm³) — shown in a compact info block.
- **Validation:** edge-manifold check (each edge shared by exactly 2 triangles). If invalid, show a red warning with the count and still allow export.
- **Min feature warning:** warn when thinnest wall < a user-set `minFeature` (default 0.8 mm for FDM, 1.0 mm for CNC with a 1 mm tool).

### 7.6 3D preview
- Embedded preview inside the 3D PREP panel (top part, 100 % width, 260 px height, resizable) using **three.js r128** (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`). `OrbitControls` are not part of the core bundle: implement a small orbit/pan/zoom controller yourself (left drag = orbit, right/middle drag = pan, wheel = zoom, double-click = reset). Do not use `THREE.CapsuleGeometry` or anything newer than r128.
- Use `BufferGeometry` built from the mesh, `MeshStandardMaterial` with two lights + ambient, optional wireframe toggle, grid at Z = 0, axes helper, view presets (Iso, Top, Front, Side).
- The preview updates **live** while parameters change (debounce 60 ms), uses `requestAnimationFrame` only while something changes or the user interacts, and disposes old geometry/material to avoid leaks.
- If WebGL is unavailable, show a message and still allow export.
- Preview color follows the object's Fill color (default light gray).

### 7.7 Export (buttons at the bottom of the 3D PREP tab)
1. **STL (binary)** – default; also **STL (ASCII)** in a dropdown. One file for the selection or per-object files (checkbox "One file per object").
2. **OBJ** (vertices + faces, mm).
3. **3MF (optional)** – only if time permits; otherwise omit the button (do not show a dead button).
4. **CNC helpers**:
   - **Height map PNG** (grayscale, white = highest, resolution selectable in px/mm, default 10 px/mm) generated from the mesh via a top-down depth render.
   - **Layer SVG slices**: for the stepped or any mode, slice at a user-defined `stepDown` mm (default 1 mm) and export an SVG with one `<g id="z-1.0">` per cutting depth (or a ZIP if JSZip is added with a pinned version) so each layer can be cut as a 2D contour.
   - **Tool/allowance note**: input `toolDiameter` (mm) applies a warning if inner corner radii are smaller than the tool radius.
5. File names: `<project>_<objectname>_<mode>_H<height>mm.stl`.
6. Downloads are triggered via `Blob` + `URL.createObjectURL` + temporary `<a download>`, then `URL.revokeObjectURL`.

### 7.8 3D PREP panel layout (top to bottom)
1. Header strip: selected object names (or "N objects").
2. 3D preview.
3. **Mode** card grid (2 columns, each with a tiny white icon) – selecting one changes the parameter block below.
4. Parameter block (rows per §6 grid).
5. Info block: dimensions, volume, mass, triangles, validation status.
6. Export buttons (primary: "Export STL").
7. "Reset 3D settings" and "Back to 2D" links.

### 7.9 Persistence
- Store the settings in `obj.threeD = { mode, height, base, direction, params…, version: 1 }` and serialize as `data-vc-3d="<JSON, URL-encoded>"` on the SVG element so it survives the SVG code round trip, undo/redo, and save/load.
- Changing 3D settings uses `commit("3D settings", …)` but debounced/merged per drag so that slider drags are one undo step.

### 7.10 ACCEPTANCE
- Select the text "VectorCutter" (Roboto 14 mm), choose Straight, H = 3: the preview shows extruded letters with open counters; export STL imports into a slicer without errors.
- Select a hexagon, choose Converging with 20°, H = 10: top hexagon is smaller by `10·tan20° ≈ 3.64 mm` on each side (inward offset); if the hexagon closes earlier, the height is clamped and the notice shows.
- Choose Diverging 20° for the same hexagon: top is larger.
- A star with a hole (via two nested shapes) keeps its hole in all modes except "To point".
- Stepped with 6 layers produces 6 terraces; layer SVG export contains 6 groups.
- Reported volume of a 10 × 10 × 5 mm rectangle with Straight mode equals 0.5 cm³ (± 0.001).

---

## 8. Non-functional requirements
- **Performance:** dragging an object in a drawing with 200 objects stays ≥ 50 FPS (batch DOM updates, avoid re-serializing the SVG code on each frame – update the code editor on a 200 ms debounce unless it is visible and in focus).
- **Robustness:** every user-facing action is wrapped so that an exception shows a toast ("Something went wrong: …") and never leaves the UI in a half state; log details to `console.error`.
- **Accessibility:** buttons have `aria-label` and `title`; focus ring visible; all panel controls reachable via Tab.
- **Code quality:** split the script into clearly labelled sections (`// ===== MODEL =====`, `// ===== RENDER =====`, `// ===== TOOLS =====`, `// ===== PANELS =====`, `// ===== CODE EDITOR =====`, `// ===== GENERATORS =====`, `// ===== 3D =====`, `// ===== EXPORT =====`). Keep functions short and documented with one-line comments.
- **Security:** never use `innerHTML` with user-provided strings (object names, text content); use `textContent` or sanitize.
- **Browser support:** current Chrome, Edge, Firefox, Safari.

---

## 9. Final self-check (output this list with PASS/FAIL after the code)

1. [ ] Canvas updates live for draw, move, resize, rotate, property edits, undo/redo, delete, without resizing the window.
2. [ ] Single `requestRender()` scheduler is used by all mutation paths; resize is not the only trigger.
3. [ ] Object list on the right exists, live, selectable, reorderable, with visibility/lock.
4. [ ] "SVG Code" button exists in the left toolbar; opens the code panel; two-way live sync; error handling; sanitizing.
5. [ ] Star generator (points, innerRatio, rotation, cornerRadius) live and non-destructive.
6. [ ] N-gon generator (sides, sizeMode, rotation, cornerRadius) live and non-destructive.
7. [ ] All icons are white in every state and theme, including Ellipse, Polygon, Star.
8. [ ] Properties panel uses the 3-column grid; no clipped units; identical control widths; no horizontal scrollbar.
9. [ ] "Prepare for 3D" entry points exist (button, context menu, Modify menu, shortcut).
10. [ ] 3D modes 1–8 implemented and working; modes 9–10 implemented or explicitly disabled with reason.
11. [ ] Text becomes outlines with holes preserved.
12. [ ] Meshes are manifold; validation and warnings work; info block shows volume/mass.
13. [ ] Live 3D preview with custom orbit controls, no WebGL crash.
14. [ ] STL (binary + ASCII) and OBJ export work; CNC height map and layer SVG export work.
15. [ ] No feature from the previous version was removed (compare against the audit in §0.1).
16. [ ] All external libraries are pinned to exact versions and loaded from cdnjs/jsDelivr.
17. [ ] Complete files delivered, no placeholders or "unchanged" elisions.

---

## 10. Suggested implementation order (to minimize risk)
1. §0 audit → §1 render architecture fix (everything else depends on it).
2. §5 icon colors and §6 Properties grid (pure CSS/markup, low risk).
3. §2 object list → §3 SVG code editor → §4 generators.
4. §7 in this order: pipeline (7.3) → Straight + Taper in/out (7.4 #1–3) → preview (7.6) → STL/OBJ export (7.7) → remaining modes → CNC helpers.
5. §8 polish → §9 self-check.