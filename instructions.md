# VectorCutter – Editor Improvement Instructions

Target: `vectorcutter.oldlane17.com` · Repo: https://github.com/oldlane17/VectorCutter
Main competitor / reference: **cuttle.xyz** (see the screenshots of Cuttle's Edit, View and Modify menus, the floating tool bar, the Text properties panel and the Components list).

> **Read this first (for the implementing agent)**
> 1. Read every file in `editor/js/` and `editor/css/editor.css` plus `editor.html` **before** changing anything. Reuse existing patterns (SVGEditor class, tool modes, undo/redo history, properties panel).
> 2. Keep the project philosophy: **vanilla JavaScript (ES6+), no build step, no npm, 100 % client-side, MIT-compatible**. If a third-party library is truly needed (e.g. for boolean path operations), vendor a single minified file into `editor/lib/` (with license header) – no CDN dependency at runtime.
> 3. Every new action must (a) be undoable via the existing history, (b) work in **Laser Cutting Mode**, (c) not break the live two-way SVG code editor, and (d) be included in the clean SVG export.
> 4. Work in the order of the numbered sections. Commit after each section with a clear message (`feat: …`). Test in the browser console with no JS errors after each step.

---

## Existing architecture (for orientation)

| File | Responsibility |
|---|---|
| `editor/js/editor-core.js` | SVGEditor class, lifecycle, undo/redo, clipboard, shortcuts |
| `editor/js/editor-canvas.js` | viewBox, coordinate systems, grid, **pan & zoom** |
| `editor/js/editor-tools.js` | tool modes, mouse dispatch, element creation |
| `editor/js/editor-selection.js` | marquee, bounding boxes, handles, snapping |
| `editor/js/editor-transform.js` | resize, rotate, scale, flip, translate |
| `editor/js/editor-properties.js` | properties panel, **LaTeX/MathJax text**, styles |
| `editor/js/editor-elements-tree.js` | elements tree, grouping, splitting |
| `editor/js/editor-laser-mode.js` | laser mode overrides |
| `editor/js/editor-export.js` | SVG serialization, text flattening, PNG export |
| `editor/js/editor-templates.js` | star / n-gon generators |
| `editor/js/editor-code.js` | live code viewer |
| `editor/js/editor-init.js` | modal helpers, URL autoload |
| `sidebar/` | tool icons |

New code should go into **new modules** where sensible (e.g. `editor-quickbar.js`, `editor-boolean.js`, `editor-fonts.js`, `editor-sidebar-resize.js`) and be registered in `editor.html`.

---

## 1. More fonts

**Goal:** A much larger, laser-friendly font selection, comparable to Cuttle's font picker (Cuttle shows a font dropdown with preview plus "Show More Options").

**Requirements**
- Create `editor/js/editor-fonts.js` holding a single font registry (array of objects: `id`, `label`, `family`, `category`, `source`, `license`, `singleLine` flag).
- Add at least **40 fonts** in categories: *Sans, Serif, Slab, Script/Handwriting (e.g. Hurricane-like thin scripts), Display, Monospace, Stencil, Single-line / engraving fonts (Hershey-style)*. Use only **OFL / Apache / public-domain** fonts (Google Fonts families are fine).
- **Privacy rule:** VectorCutter is "100 % client-side, no telemetry". Therefore self-host the font files (`/fonts/*.woff2`) instead of loading from the Google Fonts CDN, and load them lazily (only when selected or when a project uses them).
- Font picker UI in the text properties panel:
  - searchable dropdown with **live preview in the font itself**,
  - category filter chips,
  - "recently used" and "favorites" (stored in `localStorage`),
  - keyboard navigation (↑/↓/Enter).
- Support user-uploaded fonts (`.ttf`, `.otf`, `.woff2`) via file input + `FontFace` API, stored for the session (optionally IndexedDB).
- **Export correctness:** Text → path flattening in `editor-export.js` must work for every registered font (use opentype.js-style glyph outlines, vendored, or the existing flattening approach – whichever the code already uses). Add a fallback + warning toast if a font fails to load.
- Add the extra text settings that Cuttle exposes under "Show More Options": letter spacing, line height, align (left/center/right), vertical align (top/middle/bottom), and optional "welding" (merge overlapping glyphs into one outline – important for script fonts when laser-cutting).

**Acceptance**
- Selecting any font updates the canvas instantly and the exported SVG contains correct outlines.
- Reloading a saved project restores the font.

---

## 2. Text tools aware of LaTeX vs. normal text

**Goal:** When a text element is a LaTeX/MathJax element, hide or disable all settings that don't apply; show LaTeX-specific ones instead.

**Requirements** (mainly `editor-properties.js`)
- Introduce an explicit property on every text element, e.g. `data-text-mode="plain" | "latex"`, and a **mode switch** (segmented control: `Text | LaTeX`) at the top of the text panel. Convert existing LaTeX elements on load (detect via existing MathJax marker).
- **Plain text mode** shows: text content, font picker, font size (pt / mm display like Cuttle: `72 pt = 25.4 mm`), bold/italic where the font supports it, letter spacing, line height, align, vertical align, welding.
- **LaTeX mode** hides/disables: font family picker, bold/italic, letter spacing, line height, welding, "text along path". Shows instead:
  - LaTeX source textarea (monospace, with live render preview and an error message if the formula is invalid),
  - display style toggle (inline `\textstyle` vs. block `\displaystyle`),
  - scale / size (mm),
  - optional math font choice only if MathJax supports it,
  - "Convert to paths" button (LaTeX is always exported as paths).
- Disabled controls must be hidden (preferred) or greyed out with a tooltip: "Not available for LaTeX".
- Properties shown for **multi-selection** must only list the intersection of applicable settings (don't show font controls if a LaTeX item is selected together with text).
- Also make context menu / toolbar actions aware: e.g. "Text along path" and "Text within box" are disabled for LaTeX.

**Acceptance**
- Switching modes never loses the content; switching Text → LaTeX → Text restores previous plain-text settings.
- No irrelevant control is visible in LaTeX mode.

---

## 3. Better scroll / pan / zoom behaviour in the canvas

**Problem:** Scrolling currently zooms. Users expect horizontal scrolling to move horizontally and vertical scrolling to move vertically; zoom should be deliberate.

**Requirements** (`editor-canvas.js`)
- Handle the `wheel` event with `{ passive: false }` and call `preventDefault()` only on the canvas.
- Default behaviour (**"Trackpad: Scroll to Pan"**, as in Cuttle's View menu):
  - `deltaY` → pan vertically,
  - `deltaX` → pan horizontally,
  - `Shift + wheel` → convert `deltaY` to horizontal pan (classic mouse wheel users),
  - **`Ctrl/Cmd + wheel` → zoom** towards the cursor position,
  - trackpad **pinch** (browsers emit `wheel` with `ctrlKey === true`) → zoom towards the cursor.
- Alternative mode **"Mouse: Scroll to Zoom"**: plain wheel zooms towards the cursor; `Shift + wheel` pans horizontally, `Alt + wheel` pans vertically.
- Add these two modes to a new **View** menu (checkmark on the active one) and persist the choice in `localStorage`. Auto-detect on first use: if wheel events show fractional / two-axis deltas (`deltaX !== 0` or `deltaMode === 0` with small values), suggest trackpad mode, otherwise mouse mode.
- Pan speed must be proportional to the current zoom level so that it feels consistent; normalise `deltaMode` (pixel/line/page).
- Zoom limits (e.g. 1 % – 10 000 %), smooth zoom (optional requestAnimationFrame easing), zoom anchor = cursor.
- Keep existing pan alternatives: middle mouse drag, `Space + drag`, and touch two-finger pan / pinch zoom.
- Rulers and grid must update during pan/zoom without flicker.
- Add shortcuts: `=` / `-` zoom in/out, `Ctrl+0` real size (1:1 in mm – include a "Calibrate this screen" dialog like Cuttle), `Ctrl+Shift+F` fit all, `Ctrl+F` fit selected.

**Acceptance**
- Two-finger horizontal swipe moves the canvas horizontally only; vertical swipe moves vertically only.
- Ctrl+wheel and pinch zoom to the cursor.
- The page itself never scrolls while the pointer is over the canvas.

---

## 4. Quick-tools bar (floating toolbar)

**Goal:** A floating pill-shaped toolbar on the canvas (like the one at the top of Cuttle's canvas: select, node/pen tool, three transform buttons, snap tools) containing one-click actions for the current selection.

**Requirements** (new `editor-quickbar.js`)
- Floating, draggable bar, horizontally centered at the top of the canvas; collapsible; position remembered; on mobile it docks to the bottom.
- Two zones:
  1. **Tool switch**: Select (V), Node edit (N), Pen (P), plus the existing tools.
  2. **Selection actions** (enabled only when something is selected, tooltips with shortcuts):
     - **Rotate 90° clockwise / counter-clockwise** (around the selection's center or the custom rotation center if set),
     - **Rotate 180°**,
     - **Flip horizontal / vertical**,
     - **Duplicate** (Ctrl+D),
     - **Delete**,
     - **Group / Ungroup** (Ctrl+G / Ctrl+Shift+G),
     - **Bring to front / Send to back**,
     - **Align** dropdown (left, center, right, top, middle, bottom, relative to selection or canvas),
     - **Distribute** horizontally / vertically (≥ 3 elements),
     - **Center on origin** (0,0),
     - **Match size** (width / height of the first selected),
     - **Convert to paths**,
     - **Toggle snap** (grid / geometry).
- Optional "numeric nudge" row: ±1 mm / ±10 mm move, 90° / 45° / 15° rotate step values editable in settings.
- Implement actions by calling the existing transform functions in `editor-transform.js` (don't duplicate matrix math). Rotation by 90° must be **exact** (no floating-point drift – snap matrix values to 0/±1).
- Each button = one undo step.

**Acceptance**
- Rotating a shape four times by 90° returns the identical geometry.
- Bar works with multi-selection and with groups.

---

## 5. Adaptive, resizable left menu

**Requirements** (`editor.css`, new `editor-sidebar-resize.js`)
- Draggable divider between left sidebar and canvas (cursor `col-resize`), min width ≈ 56 px (icon-only mode), default ≈ 280 px, max ≈ 45 % of viewport. Double-click on the divider resets the width.
- **Icon-only collapsed mode** below a threshold (labels hidden, tooltips on hover) and a collapse/expand button.
- Persist width and collapsed state in `localStorage`.
- Use CSS variables (`--sidebar-w`) and `clamp()` so the layout adapts on window resize; the canvas must refit (`ResizeObserver`) without losing the current view center.
- Right properties panel: same resizable behaviour (shared helper), and collapsible.
- Mobile / narrow screens (< 768 px): sidebar becomes an overlay drawer (reuse the header drawer pattern from `components/layout.css`), tool buttons have ≥ 44 px touch targets.
- Group the sidebar into collapsible sections as in Cuttle: **Shapes**, **Project** (Read Me, Units & Settings), **Components**.
- Add a **search field** ("Search shapes / tools") at the top, and a **"Browse all shapes"** entry that opens a shape library modal (see §6).

---

## 6. More tools (feature parity with Cuttle and beyond)

Implement in priority order. Each tool needs: icon in `sidebar/`, menu entry, shortcut (where sensible), tooltip, and a properties panel with live parameters.

### 6.1 Top menu bar (new)
Add a menu bar similar to Cuttle: **File · Edit · View · Modify · Help**.

**Edit:** Undo/Redo, Select All, Cut/Copy/Paste, Duplicate, Delete, Group/Ungroup/Ungroup All, Bring to Front/Forward, Send Backward/to Back, Flip Horizontal/Vertical, Align Selection (submenu), **Extract as Component**, **Convert to Paths**, **Simplify Paths**, **Trace Image (beta)**.

**View:** Zoom In/Out, Zoom to Real Size, Calibrate This Screen, Zoom to Fit All / Fit Selected, Trackpad/Mouse scroll mode (§3), Show Transform Box, Show Grid, Show Guides, Snap to Grid, Snap to Geometry.

### 6.2 Basic shapes (Tier 1)
- Circle / Ellipse, Rectangle (with **per-corner radius**), Polygon (n sides – already exists), Star (already exists), Line / Polyline, **Arc / Pie / Ring**, **Rounded rectangle**, **Emoji / icon** insert (vector icons only, license-safe set), **Heart, gear, cross, arrow, speech bubble** presets, **Shape library modal** ("Browse All Shapes") with search and categories.

### 6.3 Modify tools (Tier 1 – highest value for laser users)
- **Boolean Union (Weld), Difference, Intersect** (+ Exclude/XOR). Use a vendored robust library (e.g. Clipper / paper.js boolean ops); preserve curves where possible, flatten with a configurable tolerance otherwise.
- **Expand (Offset) / Contract (Inset)** with mm value and join type (round/miter/bevel) – essential for **kerf compensation** (add a dedicated "Kerf" preset field in settings).
- **Outline Stroke** (convert stroke to filled outline).
- **Merge Paths** (join open paths with a tolerance), **Remove Holes**, **Remove Overlaps**, **Simplify Paths**.
- **Round Corners** (fillet) with radius, **Chamfer**.
- **Weld And Score** (weld outlines but keep inner lines as score paths).
- **Mask** and **Fit Within** (fit selection inside another shape).

### 6.4 Repeat / pattern tools (Tier 2)
- **Linear Repeat**, **Rotational Repeat**, **Mirror Repeat**, **Tile (grid) Repeat**, **Transform Repeat**. Implement them as **parametric/live** modifiers (parameters stay editable) or, as a first step, as one-shot generators with a preview.

### 6.5 Text tools (Tier 2)
- **Text Along Path** (disabled for LaTeX, see §2) – with offset, start position, flip side.
- **Text Within Box** (auto-fit font size/wrapping to a rectangle).
- **Line Guide** / guides: draggable horizontal/vertical guides from the rulers, shown in the elements tree like Cuttle's "Line Guide 1".

### 6.6 Production tools (Tier 2)
- **Dashed Lines** (dash/gap in mm, for perforation / scoring).
- **Layered Stack** (split design into layers for multi-layer builds), **Flatten** (collapse groups/transforms into plain paths).
- **Attach** (beta): attach element to another's anchor.
- **Material presets**: thickness (mm) and kerf per material; show as defaults for offsets and finger-joint-like tools.
- **Laser color presets**: Cut = red `#FF0000`, Engrave = black `#000000`, Score = blue `#0000FF` (one-click swatches; keep existing Laser Mode).
- **Nesting / auto-arrange** into a sheet size (simple shelf packing first).

### 6.7 Components & project (Tier 3)
- **Components** list in the sidebar (Component A, B, C …) = separate artboards/pages inside one project with thumbnails, rename, duplicate, add (+) – like Cuttle.
- **Extract as Component** from selection; **instances** of a component that update when the original is edited.
- **Read Me** (project notes) and **Units & Settings** (mm / cm / in, grid size, precision, default stroke).
- Elements tree shows project → component → elements; rename on double-click, visibility and lock toggles.

### 6.8 Import / export (Tier 3)
- Import: SVG (existing), **PNG/JPG trace to vector** (Trace Image, client-side Potrace-style algorithm), **DXF** import.
- Export: SVG (existing), PNG (existing), **DXF**, **PDF (vector)**, with a "separate files per color" option for laser software.

### 6.9 Quality-of-life
- Keyboard-shortcut cheatsheet modal (`?`), command palette (`Ctrl+K`) listing all tools, context menu (right-click) mirroring the Edit menu, status bar with cursor coordinates (mm), selection size (W × H, shown also on canvas like Cuttle's "40.0 mm / 12.9 mm" labels), and precise numeric inputs for position/size/rotation with lock-aspect toggle.

---

## 7. Non-functional requirements

- **Performance:** keep 60 fps while panning with ≥ 2 000 path nodes; throttle expensive redraws (grid, rulers) with `requestAnimationFrame`.
- **Accessibility:** all buttons reachable by keyboard, `aria-label`s, visible focus ring, sufficient contrast in light and dark theme.
- **Responsive:** desktop, tablet, phone (see §5).
- **No regressions:** existing generators (`chessboard.html`, `ruler.html`, `puzzle.html`, `advent_calendar.html`, `popup.html`) and the dashboard must keep working. Shared `<site-header>` / `<site-footer>` stay unchanged.
- **SEO / docs:** update `README.md` (feature table + architecture tree) and `about.html` where features are listed; add new modules to the README structure.
- **Licenses:** every vendored library/font must be listed in a `THIRD_PARTY_LICENSES.md`.

## 8. Test checklist (manual)

1. Scroll horizontally/vertically with trackpad and mouse + Shift; Ctrl+wheel and pinch zoom to cursor.
2. Rotate a rectangle 4 × 90° → exact original coordinates in the SVG code view.
3. Switch a text element Text ↔ LaTeX; verify visible controls change and content is preserved.
4. Pick 5 different fonts, export SVG → outlines identical to the canvas.
5. Resize/collapse the left panel, reload the page → state restored.
6. Union / Difference / Intersect on two overlapping circles; undo/redo each.
7. Laser Cutting Mode on → new tools' results follow the cut-line style.
8. Mobile viewport (375 px): sidebar drawer, quick bar docked at bottom, pinch zoom works.

## 9. Suggested delivery order

1. §3 scroll behaviour (small, high impact)
2. §4 quick-tools bar (rotate 90°, flip, align)
3. §5 resizable sidebar
4. §2 LaTeX-aware text panel
5. §1 fonts
6. §6.1 menu bar → §6.3 modify tools → §6.2 shapes → §6.4–6.9