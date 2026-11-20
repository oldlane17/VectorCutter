# VectorCutter – Instructions for Gemini

Repo: https://github.com/Oldlane17/VectorCutter
Live: https://vectorcutter.oldlane17.com/editor

## 0. READ THIS FIRST – Your freedom

**You are totally free to change everything.** The goal is a **usable, stable, good-looking editor**, not preserving the current code.

- If something below is not fixable with reasonable effort, **throw it away and rebuild it from scratch** (the selection system, the element store, the sidebar, the zoom/pan logic, the whole canvas – anything).
- You may restructure files and folders, rename things, change the architecture, introduce a build step or a framework, or rewrite the whole app, as long as the result is a working website deployable to the current domain (static hosting is preferred; keep it deployable on GitHub Pages / simple static hosting if possible).
- Do not patch around broken code with hacks. If the foundation is bad, replace the foundation.
- Before starting, read the whole repo, decide what is worth keeping, and write a short plan (`PLAN.md`) with your decisions. Then execute.
- Work in this order: **(1) core architecture → (2) bugs → (3) laser mode → (4) missing features → (5) themes → (6) polish.** Do not add features on top of a broken core.

## 1. What VectorCutter is

A free, browser-based vector editor to create and edit SVG files (and other formats) for **laser cutting**, later also **3D printing** and **CNC**. It is meant to be a **free competitor to [cuttle.xyz](https://cuttle.xyz)**. Cuttle is the reference for features and UX (Edit / View / Modify menus, components, text tools, boolean operations, repeat tools, etc.). Everything should work client-side, no account needed, no paywall.

Units are millimetres by default (inches switchable). Real-world size accuracy matters: 1 unit on screen must correspond to a real physical size when exported.

## 2. Known bugs – must be fixed

### 2.1 Selection markers (handles) scale with the object
Selection handles, the bounding box, rotation handle and node markers currently shrink/grow together with the selected element when zooming, as if they were part of the element. **They must not.**
- Render all UI overlays (handles, bounding box outline, rotation handle, node points, snapping guides, measurement labels) in a **separate overlay layer in screen space** (a separate SVG group/canvas that is not affected by the document transform).
- Handle size, stroke width, and hit areas stay constant in screen pixels at any zoom level (e.g. 8–10 px handles, 1 px outline).
- Element stroke widths must scale with zoom only if they represent real geometry; the selection outline must always be 1 px.

### 2.2 Resize cursors have the wrong orientation
The double-sided arrow cursors shown when hovering/dragging handles use the object's *original* orientation, not its current rotation.
- Compute the cursor from the **current rotation angle + handle position** (round to the nearest 22.5° or 45° step, or generate a rotated custom cursor) so that the arrow always points along the real resize direction of the handle.
- Also apply the same for the rotation cursor and for mirrored/flipped elements.
- Test with: rotated rectangle (e.g. 30°, 90°, 135°), flipped elements, rotated groups, rotated text.

### 2.3 Left sidebar is broken (especially with text elements)
See screenshot: tool labels overlap ("SelectV", "CircleC", "LineL", "TextT"), headings wrap onto the icons ("SHAPES & TOOLS", "Curve / Node Pen"), "COMPONENTS" gets cut off, and the "rectanle" input (typo!) floats above the list.
- Rebuild the sidebar layout with a proper flex/grid layout: icon column + label, no text overlapping, no wrapping of tool names (use ellipsis or tooltips).
- Fix the keyboard-shortcut hints (the stray "V", "C", "L", "T", "N", "P" glued to labels) – show them right-aligned in a muted style, or only in tooltips.
- Fix the typo "rectanle" and make that field a working **search box** ("Search shapes & tools") like in Cuttle.
- Sidebar width must be **resizable by dragging** its right edge (with min/max width, persisted), and collapsible.
- Sections: Search, Browse All Shapes, Tools/Shapes (Text, Circle, Rectangle, Polygon, Star, Line, Emoji…), Project (Read Me, Units & Settings), Components (list with previews, add button).
- Text elements must show correctly in the sidebar/element list (name, preview, no layout breakage with long or multi-line text).

### 2.4 Element tracking / state bugs
The code that tracks the current elements is buggy (e.g. the element list shows "Structure #1" and two "Text: 'Text'" entries; selection, list and canvas get out of sync; the properties panel shows wrong values).
- Introduce **one single source of truth**: a document store (e.g. an immutable state tree or a small store with events) containing elements, groups, components, layers, selection, and settings.
- Canvas, element list, and properties panel must **only render from that store**, never keep their own copy.
- Every change goes through commands/actions → this also gives you reliable **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z) for free.
- Stable unique IDs for every element. Selection stored by ID. Deleting, duplicating, grouping, reordering, locking, and hiding must keep list and canvas in sync.
- Properties panel (Width, Height, Center X/Y, Rotation…) must show the real values of the selection (also for multi-selection and for rotated elements), and editing a value must update the element exactly.
- Add tests (even simple ones) for the store: add, delete, group, undo, redo, import.

### 2.5 Zooming is inaccurate
Zooming does not keep focus on the mouse position; especially from the start screen the zoom seems to jump randomly.
- Implement zoom as a proper **zoom-around-cursor** transform: convert the cursor position to world coordinates before the zoom, apply the new scale, then adjust the pan offset so the same world point stays under the cursor.
- Fix the initial state: the start view should have a defined, sensible default (e.g. a work area of a known size centered with a clear scale), and the first zoom must behave exactly like every later zoom.
- Zoom buttons (zoom in/out) zoom around the viewport center; "Reset" returns to the default view; add "Zoom to Fit All", "Zoom to Fit Selected", "Zoom to Real Size (100 % = real mm)", and screen calibration like Cuttle.
- Min/max zoom limits, smooth zoom steps (factor ~1.1–1.2 per wheel tick), pinch-zoom on touchpads/touchscreens.
- **Scroll behaviour:** make it configurable (View menu, like Cuttle): *Trackpad mode* (scroll = pan, Ctrl+scroll = zoom, horizontal scroll moves horizontally, vertical scroll vertically) vs. *Mouse mode* (scroll = zoom). Never let horizontal scrolling zoom.
- Grid, rulers, and axis labels must stay correct and readable at all zoom levels (adaptive grid spacing).

### 2.6 Imported SVGs are not compatible with Laser Mode
- The SVG importer must convert imported content into **native editable elements** (paths, shapes, text, groups) instead of keeping an opaque raster/blob/`<image>`/foreign structure (the black block in the screenshot suggests an import is rendered as filled box).
- Handle: `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`, `<g>`, `<use>`, `<text>` (convert to paths optionally), `transform` attributes (including nested), `viewBox` and unit scaling (px, mm, cm, in, pt – correct DPI handling, 96 dpi default, mention Inkscape's 90 dpi/ Illustrator's 72 dpi differences), `style` attributes and CSS classes, `<defs>`, clip paths, simple masks, fill-rule evenodd/nonzero.
- Strokes and fills are translated into laser semantics (see section 3): thin strokes → cut/score lines, filled areas → engrave. Offer an import dialog: "Interpret colours as: Cut / Score / Engrave" with a colour-to-operation mapping table.
- Embedded raster images: keep as image elements (for engraving), clearly marked, with an option to **trace** them to vectors.
- Report problems in a friendly import log (unsupported features, skipped elements) instead of failing silently.
- Provide a set of test SVGs in `/tests/svg/` (Inkscape output, Illustrator output, Figma output, Cuttle export, Fusion 360 export) and make them all import correctly.

## 3. Laser Cutting Mode (top-right switch)

The "Laser Cutting Mode" toggle currently looks off and is not implemented. Make it a real feature.

**UI:** a clean toggle with clear on/off states, tooltip, and a visible mode indicator (status bar + subtle canvas change). When on, show a **Laser panel**.

**Behaviour when Laser Mode is ON:**
- Operations per element/colour: **Cut**, **Score**, **Engrave** (fill/raster), **Ignore/Guide**. Standard colour convention (e.g. red/blue = cut, black = engrave, etc.) editable by the user, plus manual per-element assignment.
- Display preview: hairline stroke (true kerf-like thin lines) for cut/score, hatch or shaded fill for engrave, guides greyed out.
- **Material/sheet setup:** sheet size (presets + custom), thickness, kerf compensation (offset for inside/outside cuts), origin, bed boundary shown on canvas with warning for elements outside the bed.
- **Cut order optimisation:** inner paths before outer paths, nearest-neighbour ordering, option to reverse paths, start point selection, minimise travel.
- **Checks/warnings:** open paths that should be closed, overlapping/duplicate lines, tiny segments, elements outside the bed, self-intersections, text not converted to paths.
- Tools useful for laser: Remove Overlaps, Remove Holes, Weld, Weld And Score, Dashed Lines, Offset (Expand/Contract), Tabs/bridges, Kerf compensation, Nesting (later).
- **Export for lasers:** SVG (clean, with correct units and stroke colours), DXF, PDF, and optionally G-code / LightBurn-friendly SVG. Exported file must open at the correct physical size.
- Laser mode state is saved in the project file.

## 4. Missing features (implement, orientation = Cuttle.xyz)

Several menu items and features are listed but not implemented. **Every menu entry must either work or be removed/hidden.** No dead buttons. Use the screenshots from cuttle.xyz in the chat as reference. Prioritise as follows.

### 4.1 Core editing
- Select, Pan, multi-select (shift-click, rubber band), select all, deselect, Escape.
- Move, resize, rotate, flip horizontal/vertical, nudge with arrow keys (Shift = bigger step).
- Copy, Cut, Paste, **Duplicate (Ctrl+D)**, Delete, Group/Ungroup (Ctrl+G / Ctrl+Shift+G), Ungroup All.
- Z-order: Bring to Front / Forward / Send Backward / Send to Back.
- Align Selection (left, centre, right, top, middle, bottom) and Distribute.
- Lock, hide, rename elements in the Elements list; drag to reorder.
- Undo/Redo with a proper history.
- Snap: Snap to Grid, Snap to Geometry (endpoints, midpoints, centres, intersections), guides, rulers with draggable guides, smart alignment lines.
- Right-click context menu with the same actions.
- Keyboard shortcuts everywhere (shown in menus).

### 4.2 Drawing tools
Rectangle (with corner radius), Circle, Ellipse, Polygon, Star, Line, **Pen/Bezier (Curve & Node tools)**, Freehand path, Arc, Text, Emoji/symbols, plus a **shape library ("Browse All Shapes")** with gears, boxes, brackets, hinges, living hinges, finger joints (box generator), etc.
- Node editing: move/add/delete nodes, convert corner↔smooth, handle editing, join/break paths, close/open paths.

### 4.3 Text (important – laser/engraving use)
- Many fonts (bundle a set of free, open-licensed Google Fonts incl. script, sans, serif, mono, stencil, single-line "engraving" fonts), font picker with live preview, search.
- Size (pt/mm), align, vertical align, letter spacing, line height, multi-line text, bold/italic where available.
- Text is **live-editable** until "Convert to Paths". Convert to paths works reliably (needed for laser export). Welding of overlapping letters (important for script fonts, see Cuttle "welding" option).
- Support user font upload (TTF/OTF/WOFF).
- **LaTeX-aware text:** when a text element is LaTeX, hide settings that do not apply and render math correctly (MathJax/KaTeX → paths).
- Text Along Path, Text Within Box.

### 4.4 Modify menu (Cuttle parity)
- **Repeat:** Mirror Repeat, Linear Repeat, Rotational Repeat, Tile Repeat, Transform Repeat (all live/parametric).
- Round Corners, Dashed Lines, Text Along Path, Text Within Box.
- Merge Paths.
- Outline Stroke, Expand (Offset), Contract (Inset).
- **Booleans:** Union (Weld), Difference, Intersect, Exclusion.
- Mask, Fit Within, Attach.
- Flatten, Layered Stack.
- Remove Holes, Remove Overlaps, Weld And Score.
- Simplify Paths, Trace Image (bitmap → vector), Convert to Paths.
- Use a robust geometry library for booleans/offsets (e.g. Clipper2 / paper.js / polygon-clipping via WASM or JS) instead of home-made code.

### 4.5 Components & parametric design (Cuttle's killer feature)
- **Components:** reusable objects with their own artboard, listed in the sidebar with preview, instances in other components, edit once → all instances update. "Extract as Component" from the Edit menu.
- Per-element **parameters/constraints** (width, height, count, radius…) editable in the properties panel, simple **expressions/variables** (e.g. `width / 2 + thickness`), project-level variables (material thickness, kerf).
- Properties panel with sections (Text, Transform, Appearance, etc.), collapsible, like Cuttle.

### 4.6 Files & formats
- Native project format (JSON, `.vcut`), autosave to the browser (IndexedDB/localStorage), open/save to disk, recent projects.
- Import: SVG, DXF, PNG/JPG (as image or trace), PDF (vector pages, later), project files.
- Export: SVG, DXF, PDF, PNG, and later G-code (CNC/laser), STL/3MF from extruded 2D shapes (3D printing – extrude with thickness, simple; further 3D features later).
- Export dialog with selection-only, units, scale, stroke/colour options, preview.
- Share: export/import link or file.

### 4.7 CNC / 3D printing (later phase, design for it now)
- Keep the data model extensible: layers/operations with tool parameters (tool diameter, depth, passes, feed rate) so CNC toolpaths (profile, pocket, drill) and G-code can be added.
- Extrude-to-STL/3MF for 3D printing as a first simple step.

### 4.8 Misc
- Settings: units (mm/in), grid size, snapping, theme, language (at least English; structure for i18n), scroll mode, canvas size.
- Help menu: keyboard shortcut list, short tutorial/first-run walkthrough, Read Me project page, link to GitHub/issues.
- A friendly **start screen** (new project, open, templates, recent).
- Performance: smooth with thousands of path nodes (use `requestAnimationFrame`, avoid full re-render on every mouse move, use Canvas/WebGL or SVG with caching if needed).

## 5. Light and Dark mode

- Provide **both a light and a dark theme** plus an "auto" option following the system (`prefers-color-scheme`), switchable in Settings (and a quick toggle in the top bar). Persist the choice.
- Implement with CSS variables/design tokens (background, surface, border, text, accent, canvas background, grid colour, selection colour, handle colour).
- The canvas, grid, rulers, handles, menus, dialogs, sidebar, and properties panel must all be themed. Check contrast (WCAG AA) in both themes.
- Element colours that represent real data (laser operation colours) must not change with the theme; only the editor chrome does.

## 6. UI/UX requirements

- Top bar: File, Edit, Modify, View, Settings, Help (+ Share), project name, Laser Mode toggle, theme toggle. All menus keyboard-accessible, closing on outside click/Escape.
- Toolbar (Canvas Mode: Select / Pan, Grid, Snap, Zoom) – clean and consistent icons, no wrapping.
- A **Quick-Tools bar** near the canvas for the selection (e.g. rotate 90°, flip, duplicate, group, align, delete), like Cuttle's floating toolbar.
- Status bar with cursor coordinates, units, mode, tips – fix the clipped bits.
- Responsive layout: works on desktop first, usable on tablets; minimum width handling instead of broken layout.
- Smooth, no flicker, no random jumps. No console errors.

## 7. Quality requirements

- Clean, modular code with clear folders (e.g. `core/` store & commands, `render/`, `tools/`, `io/` import-export, `ui/`, `geometry/`, `laser/`), comments where logic is non-obvious.
- A `README.md` (what it is, how to run, how to deploy, shortcuts) and a short `ARCHITECTURE.md`.
- Test the following manually and (where possible) automatically before finishing:
  1. Zoom in from the start screen with the mouse at several positions → the point under the cursor stays fixed.
  2. Select + zoom → handles keep constant screen size.
  3. Rotate an element 45° and 90° → resize cursors point in the correct directions.
  4. Create text, edit, convert to paths, check sidebar and elements list.
  5. Create/delete/duplicate/group/undo/redo 50 times → list and canvas never disagree.
  6. Import the test SVGs → they appear as editable elements and work in Laser Mode; export to SVG and open in Inkscape/LightBurn at the right size.
  7. Toggle Laser Mode and the theme → no layout breaks.
- Keep it free and open: no tracking, no paywalls. Respect font and library licences (list them in `LICENSES.md`).

## 8. Definition of done

The editor loads without errors, the core interactions (select, move, resize, rotate, zoom, pan, undo/redo, text, import/export) are **reliable**, laser mode is functional, light and dark themes exist, no menu entry is a dead end, and the most important Cuttle-style features (booleans, repeats, offsets, components, fonts) work. When in doubt: **make it usable first, then complete.** If the existing code stands in the way – rewrite it.