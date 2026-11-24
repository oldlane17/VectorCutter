# VectorCutter – Optimisation & Bug Fix Specification

**Date:** 2026-11-24  
**Branch:** `main`  
**Scope:** Bugs found in live editor after the v2.5.0 render-singleton fix, plus two tool redesigns and one new feature (rotation-centre control).

Read this document top-to-bottom before writing any code. Where it says **MUST**, treat it as a hard requirement.

---

## 0. Working rules

1. **Audit before editing.** Read every file you will touch in full before changing it.  
2. **No regressions.** Every feature that works today (selection, draw tools, zoom/pan, Properties panel, Objects panel, SVG Code, Laser Prep, 3D Prep, undo/redo) MUST still work after your changes.  
3. **Deliver complete files.** Output every changed file in full. No `// rest unchanged`, `...`, or omissions.  
4. **No new build step.** Plain ES modules, no bundler.  
5. **Follow existing code style.** JSDoc one-liners, same import path conventions, same `store.commit()` / `store.dispatch()` patterns.

---

## Bug 1 — Selection does not work

### Symptom
Clicking on a shape on the canvas does not select it; the selection handles never appear even though the shape is clearly visible.

### Root Cause
In `editor/js/tools/select.js`, the `captureInitialState()` method calls:

```js
this.initialCenter = transformPoint(cx, cy, el.transform);  // line 241 (approx)
```

But in `editor/js/model/matrix.js`, `transformPoint` has the signature:

```js
export function transformPoint(m, p)   // matrix first, point second
```

The arguments are **swapped** — the matrix is passed as the first arg to a numeric `cx`, and a number is passed where the `{x, y}` point object is expected. This causes `NaN` propagation into `this.initialCenter`, which then corrupts `this.initialAngle`, which makes the entire pointer-down logic fail silently (the hit-test itself passes but state capture throws).

Additionally, `hitTest()` in `select.js` does a pure AABB test against `transform[4]` / `transform[5]` (the translation components), ignoring rotation. A rotated object whose bounding box has drifted from its translate origin will never be hit.

### Required Fix

**A. Fix `transformPoint` call order in `select.js` → `captureInitialState()`:**

```js
// WRONG (current)
this.initialCenter = transformPoint(cx, cy, el.transform);

// CORRECT
this.initialCenter = transformPoint(el.transform, { x: cx, y: cy });
```

**B. Fix rotated-object hit-testing in `hitTest()`:**  
The current code checks `worldPt` against the axis-aligned box of `transform[4] + bounds.x … + bounds.width`. When the element is rotated, the AABB is incorrect. Replace the fallback AABB hit-test with a proper **point-in-rotated-OBB** test using the four transformed corners from `getTransformedCorners()` (already in `bounds.js`) and a 2D point-in-convex-polygon check:

```js
function pointInPolygon(px, py, corners) {
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].x, yi = corners[i].y;
        const xj = corners[j].x, yj = corners[j].y;
        if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}
```

Replace the `tx + b.x … b.width` check inside the for-loop with:
```js
const corners = getTransformedCorners(b, item.transform);
if (pointInPolygon(worldPt.x, worldPt.y, corners)) return id;
```

### ACCEPTANCE
- Click any shape (including one rotated 45°): it gets selected and shows handles.
- Click empty canvas: selection clears.
- Shift-click second shape: both are selected.
- Marquee drag: selects all shapes whose OBBs overlap.

---

## Bug 2 — Rotation via toolbar buttons does not work

### Symptom
Clicking the 90°CW / 90°CCW / 180° toolbar buttons has no visible effect on the canvas even though a shape is selected.

### Root Causes

**A. Wrong centre calculation in `quickbar.js → rotateSelection()`:**  
```js
// CURRENT (wrong for rotated elements)
const cx = el.transform[4] + box.width / 2;
const cy = el.transform[5] + box.height / 2;
```
`el.transform[4]` and `[5]` are the raw translate components of the affine matrix — they are correct only for unrotated elements. For a rotated element the visual centre must be derived by transforming the **local bounding-box centre** through the full transform:
```js
const localCx = box.x + box.width / 2;
const localCy = box.y + box.height / 2;
const { x: cx, y: cy } = transformPoint(el.transform, { x: localCx, y: localCy });
```

**B. `rotationMatrix` already supports `(deg, cx, cy)` in `matrix.js` — the pivot is computed correctly once A is fixed, but the full transform application is also inverted:**  
```js
// CURRENT
after: multiplyMatrix(rot, el.transform)
// CORRECT: apply rotation around world-centre then to existing transform
after: multiplyMatrix(rot, el.transform)
```
Actually the multiply order is correct (pre-multiply). The only real fix is A — the wrong centre.

**C. Missing `requestRender()` after `store.dispatch()` in `rotateSelection()`:**  
`TransformElementsCommand` calls `events.emit('document:changed')` which triggers `requestRender()` through the subscription in `main.js`, so this should work. Confirm by checking that `store.dispatch` does call `events.emit` after the command is applied.

### Required Fix

In `editor/js/ui/quickbar.js` → `rotateSelection(deg)`:

```js
rotateSelection(deg) {
    const selected = this.store.getSelectedElements();
    if (selected.length === 0) return;

    const transforms = [];
    selected.forEach(el => {
        const box = getElementLocalBounds(el);
        // Compute world-space visual centre of the element
        const localCx = box.x + box.width / 2;
        const localCy = box.y + box.height / 2;
        const { x: cx, y: cy } = transformPoint(el.transform, { x: localCx, y: localCy });

        const rot = rotationMatrix(deg, cx, cy);
        transforms.push({
            id: el.id,
            before: [...el.transform],
            after: multiplyMatrix(rot, el.transform)
        });
    });

    this.store.dispatch(new TransformElementsCommand(transforms));
}
```

Add `import { transformPoint } from '../model/matrix.js';` to the import line (it is already partially imported — just add `transformPoint`).

Also apply the same fix to `flipSelection()` for consistency.

### ACCEPTANCE
- Select a rectangle rotated 30°. Click 90°CW: it rotates 90° around its **visual centre**, not around (0,0) or its top-left creation point.
- 180° button: rotates 180° around visual centre.
- Undo restores the previous rotation.

---

## Bug 3 — Rotation grab handle does not work

### Symptom
Dragging the rotation handle (the round dot above the selection box) does not rotate the shape; it either does nothing or jumps to a wrong angle.

### Root Cause
Same as Bug 1B: `captureInitialState()` stores `this.initialCenter` with swapped `transformPoint` arguments, producing `NaN`. Every subsequent `applyHandleTransform()` for the `'rot'` handle then computes `NaN - NaN` for the angle delta, so no transform is applied.

### Required Fix
Fix A from **Bug 1** (`transformPoint` argument order) automatically fixes this bug too — they share the same code path.

Additionally, verify the **overlay renderer** actually appends the rotation handle with `data-handle="rot"` to the SVG overlay layer. If the handle element is never created or is positioned off-screen, dragging it never fires `onPointerDown` with `handle === 'rot'`. Check `editor/js/view/overlay.js` for the rotation handle creation and ensure:
1. The handle `<circle>` or `<rect>` has `dataset.handle = 'rot'`.
2. Its position is `initialCenter.y - someOffset` above the bounding box, correctly derived from the **transformed** bounding box corners (use `getTransformedCorners` → take the topmost corner's midpoint).

### ACCEPTANCE
- Select a shape. A rotation handle appears above the bounding box.
- Drag the handle: shape rotates live around its visual centre.
- Hold Shift: rotation snaps to 15° increments.
- Release: transform is committed and undo works.

---

## Bug 4 — Lock only prevents moving, not resizing/reshaping

### Symptom
When an object is locked in the Objects panel, it cannot be moved by dragging, but it CAN still be resized and reshaped using the 8-point handles. Lock is supposed to make the object fully non-editable from the canvas.

### Root Cause
In `select.js → onPointerDown()`, the locked check applies only to the click-to-select path and to the drag translation in `onPointerMove()`:

```js
// Hit-test guard
if (hitEl && hitEl.locked) return;

// Drag guard (partial)
if (el && !el.locked) {
    el.transform = multiplyMatrix(translationMatrix(dx, dy), initM);
}
```

But in `onPointerDown()`, the **handle branch** (`if (handle)`) runs **before** the hit-test branch and has **no lock check at all**:

```js
if (handle) {
    this.isTransforming = true;   // ← no lock guard
    ...
}
```

If the user clicks a handle on a locked element, `captureInitialState()` will still gather the locked element's state and `applyHandleTransform()` will mutate it.

### Required Fix

In `select.js → onPointerDown()`, add a lock guard **at the top of the handle branch**:

```js
if (handle) {
    // Check if the element owning this handle is locked
    const selectedEls = this.store.getSelectedElements();
    const anyLocked = selectedEls.some(el => el.locked);
    if (anyLocked) return;   // ← ADDED

    this.isTransforming = true;
    this.activeHandle = handle;
    this.dragStart = { x: pt.x, y: pt.y };
    this.captureInitialState();
    e.stopPropagation();
    return;
}
```

Also ensure that locked elements are not shown with resize handles in the overlay (the renderer should skip drawing handles if `el.locked`). Add a guard in `overlay.js` where selection handles are rendered:

```js
if (selected.length === 1 && !selected[0].locked) {
    // draw 8 resize handles + rotation handle
}
// Always draw the highlight outline, even for locked elements,
// so the user can see what is locked.
```

### ACCEPTANCE
- Lock an element. Its outline is still highlighted when selected in the Objects panel.
- No resize or rotation handles appear on the canvas for a locked element.
- Attempting to drag a handle (even if somehow accessible) has no effect.
- Unlocking restores full handle interactivity.

---

## Feature 1 — Rotation centre = visual mass centre (default), with configurable override

### Current Behaviour
The rotation centre (`this.initialCenter`) used for drag-rotation and button-rotation is computed from the **local bounding box top-left** plus the creation-time translate — essentially the point where the element was placed, not its visual centre.

### Required Behaviour

#### 1A. Default rotation centre = visual mass centre

The visual mass centre for all standard shapes is the centre of their transformed bounding box:

```js
const box   = getElementLocalBounds(el);
const localCx = box.x + box.width  / 2;
const localCy = box.y + box.height / 2;
const worldCentre = transformPoint(el.transform, { x: localCx, y: localCy });
```

This MUST be the default, used in both `captureInitialState()` (for drag-rotate via handle) and `rotateSelection()` in `quickbar.js` (for button-rotate).

For **multi-selection**, use the centre of the combined axis-aligned bounding box of all selected elements' transformed corners.

#### 1B. Per-object custom rotation centre

Each element in the data model gains an optional field:

```js
el.rotationCenter = {
    mode: 'object',    // 'object' | 'absolute'
    x: 0,             // in object-relative coords (when mode='object')
                      //   or in document coords (when mode='absolute')
    y: 0
}
```

When `el.rotationCenter` is set, all rotation operations (drag handle, toolbar buttons, Properties panel input) MUST use it instead of the computed mass centre:

```js
function getRotationCentre(el) {
    if (!el.rotationCenter) {
        // Default: visual mass centre
        const box = getElementLocalBounds(el);
        return transformPoint(el.transform, { x: box.x + box.width/2, y: box.y + box.height/2 });
    }
    if (el.rotationCenter.mode === 'absolute') {
        return { x: el.rotationCenter.x, y: el.rotationCenter.y };
    }
    // 'object' mode: transform the object-relative point through the element's transform
    return transformPoint(el.transform, { x: el.rotationCenter.x, y: el.rotationCenter.y });
}
```

Export `getRotationCentre` from a suitable model file (e.g. `bounds.js`) and import it in `select.js`, `quickbar.js`, and `properties.js`.

#### 1C. Rotation centre UI in the Objects panel context menu

In `editor/js/ui/objects-panel.js → showContextMenu()`, add a new item **"Set Rotation Centre…"** after the separator above "Bring to Front":

```html
<div class="vc-dropdown-item" id="ctxSetRotCenter">Set Rotation Centre…</div>
```

Clicking it opens an **inline sub-panel** (a small absolutely-positioned card, not a modal) with:

```
┌─────────────────────────────────────┐
│  ROTATION CENTRE                 ✕  │
├─────────────────────────────────────┤
│  X  [_______]  mm                   │
│  Y  [_______]  mm                   │
│                                     │
│  Reference:                         │
│  ○ Relative to object               │
│  ○ Absolute document coordinates    │
│                                     │
│  [Reset to mass centre]  [Apply]    │
└─────────────────────────────────────┘
```

- **X / Y inputs** are pre-filled with the current rotation centre (if set) or the mass centre (if not set), expressed in the selected reference mode.
- **"Relative to object"** (`mode: 'object'`): X/Y are in the element's local coordinate space (before `el.transform` is applied). The user can set (0, 0) to mean "top-left of bounding box", or the mass-centre coords (half-width, half-height relative to `box.x, box.y`).
- **"Absolute document coordinates"** (`mode: 'absolute'`): X/Y are in mm document space, unchanged by any future move/rotate of the object.
- **"Reset to mass centre"** button: sets `el.rotationCenter = null` (reverts to default).
- **"Apply"** button: calls `store.commit('Set Rotation Centre', doc => { doc.elements[id].rotationCenter = { mode, x, y }; })`.

The card dismisses on Escape, on clicking outside, or after Apply/Reset.

**Visual indicator on canvas:** When `el.rotationCenter` is set, the overlay renderer MUST draw a small crosshair (⊕) at the rotation centre world position in addition to the standard rotation handle, so the user can see where the pivot is.

#### 1D. SVG round-trip persistence

Serialize `el.rotationCenter` as a `data-vc-rotcenter` attribute on the SVG element (URL-encoded JSON), and restore it in the SVG import parser.

### ACCEPTANCE
- Draw a rectangle. Its rotation centre defaults to its visual mass centre.
- Open context menu → "Set Rotation Centre…" → enter X=0, Y=0, mode=Relative → Apply. The rotation centre crosshair appears at the top-left corner.
- Rotate via handle: the rectangle pivots from its top-left corner.
- Open context menu → Reset → the rotation centre returns to mass centre.
- Save as SVG, reload: custom rotation centre is preserved.

---

## Feature 2 — Pen / Path tool: freehand drawing

### Current Behaviour
The Pen / Path tool places a new straight-line vertex on every pointer-down click and builds a polyline from connected `L` commands. This is a **click-to-place** polyline builder, not a freehand drawing tool.

### Required Behaviour
The Pen / Path tool MUST become a **pressure-free freehand drawing tool** (like a pencil / felt-tip):

| Event | Action |
|---|---|
| `pointerdown` | Begin a new path at the cursor position; set `isDrawing = true`. |
| `pointermove` | While `isDrawing`, append the current cursor position as a point. Live-preview the path. |
| `pointerup` | End the path; simplify it; commit to the store. |

#### 2A. Path simplification
Raw freehand input produces hundreds of near-collinear points. After `pointerup`, apply the **Ramer–Douglas–Peucker** algorithm (implement inline, ~20 lines) with an epsilon of **0.5 mm** (configurable via a hidden constant `FREEHAND_SIMPLIFY_EPSILON`). This keeps the path faithful to the gesture while reducing vertex count by 80–95%.

```js
function rdp(points, epsilon) {
    if (points.length < 3) return points;
    // Find the point with the maximum distance from the line start→end
    let maxDist = 0, maxIdx = 0;
    const start = points[0], end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
        const d = pointToLineDistance(points[i], start, end);
        if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
        const left  = rdp(points.slice(0, maxIdx + 1), epsilon);
        const right = rdp(points.slice(maxIdx), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [start, end];
}
```

#### 2B. SVG path string
Build the path as a smooth `M … L … L …` from the simplified points. Optionally use `C` (cubic Bézier) for a smoother result by converting adjacent line segments with Chaikin's algorithm, but `L` is acceptable and simpler.

#### 2C. Live preview
While dragging, update `this.previewEl.geometry.d` with the raw (unsimplified) point list (using `M x0 y0 L x1 y1 …`) and call `requestRender()` on every `pointermove`. This gives immediate visual feedback. Apply RDP only on `pointerup`.

#### 2D. Auto-close
If the final point is within **5 mm** of the first point, append `Z` to close the path (same threshold as the current implementation).

#### 2E. Style defaults
Freehand paths should default to:
- `fill: none`
- `stroke`: the current default stroke colour
- `strokeWidth`: 0.5 mm

#### 2F. Pointer capture
Call `e.target.setPointerCapture(e.pointerId)` on `pointerdown` so that fast strokes that leave the canvas element still complete cleanly.

### Implementation (complete replacement of `editor/js/tools/pen.js`)

```js
const FREEHAND_SIMPLIFY_EPSILON = 0.5; // mm

export class PenTool {
    constructor(camera, store) {
        this.camera = camera;
        this.store  = store;
        this.isDrawing = false;
        this.rawPoints = [];   // {x, y} in world coords
        this.origin    = null;
        this.previewEl = null;
    }

    onPointerDown(pt, e) {
        this.isDrawing = true;
        this.origin    = { x: pt.x, y: pt.y };
        this.rawPoints = [{ x: 0, y: 0 }];

        this.previewEl = createElement('path', {
            d: 'M 0 0',
            style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5 },
            transform: translationMatrix(pt.x, pt.y)
        });
        this.store.doc.elements[this.previewEl.id] = this.previewEl;
        this.store.doc.order.push(this.previewEl.id);
        this.store.setSelection([this.previewEl.id]);

        // Capture pointer so fast strokes don't lose events
        if (e && e.target && e.target.setPointerCapture) {
            try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
        }
        requestRender();
    }

    onPointerMove(pt) {
        if (!this.isDrawing || !this.previewEl) return;
        const lx = pt.x - this.origin.x;
        const ly = pt.y - this.origin.y;
        this.rawPoints.push({ x: lx, y: ly });

        // Live preview with raw (unsimplified) points
        this.previewEl.geometry.d = this._buildD(this.rawPoints, false);
        requestRender();
    }

    onPointerUp() {
        if (!this.isDrawing || !this.previewEl) return;
        this.isDrawing = false;

        const simplified = rdp(this.rawPoints, FREEHAND_SIMPLIFY_EPSILON);

        // Auto-close if endpoint is near origin
        const last = simplified[simplified.length - 1];
        const close = simplified.length > 2
            && Math.hypot(last.x, last.y) < 5;

        const finalD = this._buildD(simplified, close);

        const finalEl = { ...this.previewEl, geometry: { d: finalD } };
        delete this.store.doc.elements[this.previewEl.id];
        const idx = this.store.doc.order.indexOf(this.previewEl.id);
        if (idx !== -1) this.store.doc.order.splice(idx, 1);

        this.store.dispatch(new AddElementCommand(finalEl));
        this.store.setSelection([finalEl.id]);
        this.previewEl = null;
        this.rawPoints = [];
        requestRender();
    }

    _buildD(points, close) {
        if (points.length === 0) return 'M 0 0';
        let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
        }
        if (close) d += ' Z';
        return d;
    }
}

// Ramer-Douglas-Peucker simplification
function rdp(points, eps) { /* full implementation as shown in §2A */ }
function pointToLineDistance(p, a, b) { /* cross-product method */ }
```

### ACCEPTANCE
- Select Pen / Path tool. Hold mouse button and draw a freehand curve: the path follows the cursor continuously.
- Release: path is simplified and committed (vertex count ≤ 10 % of raw for a simple arc).
- Undo removes the path in one step.
- Drawing near the starting point auto-closes.

---

## Feature 3 — Curve / Node tool: interactive Bézier handle editing

### Current Behaviour
The Curve / Node tool draws a single quadratic Bézier segment (`Q`) where the control point is **hard-coded** as `(dx/2, dy − 20)`. There is no way for the user to adjust the curve shape after drawing.

### Required Behaviour
The Curve / Node tool MUST be redesigned to do two things:

**Mode A — Draw new Bézier segments** (when no path is selected):  
Draw `C` (cubic Bézier) curves interactively:
1. `pointerdown` → anchor the start point.
2. `pointermove` while button held → drag out the **first control handle** (pull direction from the start anchor; mirror for a symmetric "smooth" curve).
3. `pointerup` → release to place the first segment's end-point implicitly at mouse position; the user can click again to chain segments.
4. Double-click or press Enter / Escape → finalize the path.

**Mode B — Edit existing path nodes** (when a `path` element is selected):  
Display all anchor points and control handles of the selected `path`'s `d` attribute. Allow:
- Drag anchor points to move them.
- Drag control-handle diamonds to reshape the curve tangent.
- Click to select individual nodes (highlight); Delete to remove a node.
- Double-click a straight segment to convert it to a curve (insert a control handle).
- Double-click a curve segment to convert it to a straight line (remove its control handles).

### Implementation notes

#### Parsing the path `d` attribute
Use a minimal SVG path parser that understands absolute `M`, `L`, `C`, `Q`, `Z` commands (the commands VectorCutter itself generates). Store the parsed segment list as `this.segments = [{cmd, args}, ...]` and rebuild the `d` string from it after each edit.

```js
// Segment types to support:
// { cmd: 'M', args: [x, y] }
// { cmd: 'L', args: [x, y] }
// { cmd: 'C', args: [cx1, cy1, cx2, cy2, x, y] }
// { cmd: 'Q', args: [cx, cy, x, y] }
// { cmd: 'Z', args: [] }
```

#### Overlay rendering for node handles
When Mode B is active, the **overlay renderer** (`view/overlay.js`) MUST render:
- Filled white squares (4 × 4 px screen) at every anchor point.
- Filled white diamonds (4 × 4 px rotated 45°) at every control handle.
- Thin dashed lines connecting each anchor to its control handles.
- Selected nodes highlighted with the accent blue (`#4a9eff`).

Assign `data-handle="node-{i}"` and `data-handle="ctrl-{i}-{which}"` to these elements so `select.js → onPointerDown()` can delegate to the NodeTool when Mode B is active.

#### Curve intensity ("angle / radius")
In the **Properties panel**, when a path is selected and Mode B is active, show a **CURVE HANDLES** section with:

| Row | Control | Unit |
|---|---|---|
| Smooth | Toggle (on = mirror control handles) | — |
| Handle length | Numeric input | mm |

Changing "Handle length" scales both control handles of the currently selected node relative to the anchor point without changing their direction.

#### Breaking the parametric link (existing behaviour)
Keep the existing `activate()` method that converts star/polygon generators to plain paths when the Node tool is activated.

### Implementation structure

Rewrite `editor/js/tools/node.js` as a **state-machine** with two explicit modes:

```
NodeTool.mode = 'draw' | 'edit'
```

Activate:
- If the selection contains a `path` element → `mode = 'edit'`, parse segments.
- Otherwise → `mode = 'draw'`.

Event handling in `onPointerDown / Move / Up`:
- Delegate to `_drawPointerDown` / `_editPointerDown` etc. based on `this.mode`.

### ACCEPTANCE
- Select Curve / Node tool with nothing selected: cursor becomes a pen. Click-drag on canvas: a smooth Bézier curve is drawn. The rubber-band preview shows the curve live.
- Select Curve / Node tool on an existing path: anchor and control-handle diamonds appear. Dragging a control handle changes only the curve tangent, live.
- Dragging an anchor point moves that node; adjacent segments update.
- Deleting a node with Delete key reconnects the remaining segments.
- In Properties panel → "Handle length" input changes the control-handle magnitude of the selected node.

---

## Issue 5 — Quickbar redesign: remove shape shortcuts, add tool-behaviour controls

### Current Behaviour (what is wrong)
The floating quickbar (`editor.html` lines 213–280, controlled by `editor/js/ui/quickbar.js`) duplicates the left sidebar's shape tool buttons — it shows Select, Rectangle, Circle, Polygon, Star, Curve, and Pen buttons. These are already listed in the left sidebar with keyboard shortcuts. The quickbar is therefore redundant for shape selection and wastes precious horizontal space. The quickbar has no controls for how tools *behave* (snap mode, selection mode, drawing colour).

### Required Behaviour

**A. Remove shape-switching buttons from the quickbar HTML (`editor.html`)**  
Delete all `<button data-quick-tool="...">` elements from `#quickbar` except the **Select** button (keep it because it is the most common mode switch):

Buttons to **REMOVE** from the quickbar:
- `data-quick-tool="rectangle"`
- `data-quick-tool="circle"`
- `data-quick-tool="polygon"`
- `data-quick-tool="star"`
- `data-quick-tool="curve"`
- `data-quick-tool="path"`

The Select button (`data-quick-tool="select"`) and the divider **STAY**.  
The selection-action buttons (Rotate CCW/CW, 180°, Flip H/V, Duplicate, Delete) **STAY**.

**B. Add three new control groups to the quickbar**, in this order after the Select button and before the existing divider:

**Group 1 — Selection mode** (single toggle, affects the marquee / rubber-band select behaviour):

```html
<div class="vc-quickbar-group" title="Selection mode">
    <button class="vc-quickbar-btn vc-toggle-btn active" id="qbSelRect"
            title="Rectangular marquee selection" data-sel-mode="rect">
        <!-- rectangle dashed icon -->
        <svg class="vc-icon" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 3"/>
        </svg>
    </button>
    <button class="vc-quickbar-btn vc-toggle-btn" id="qbSelFree"
            title="Freehand / lasso selection" data-sel-mode="lasso">
        <!-- lasso icon -->
        <svg class="vc-icon" viewBox="0 0 24 24">
            <path d="M6 12 C4 6 10 2 14 6 C18 10 16 18 10 18 C6 18 4 15 6 12"/>
        </svg>
    </button>
</div>
<div class="vc-quickbar-divider"></div>
```

**Group 2 — Snap / magnet mode** (tri-state: Grid snap | Geometry snap | No snap):

```html
<div class="vc-quickbar-group" title="Snap mode">
    <button class="vc-quickbar-btn vc-toggle-btn" id="qbSnapGrid"
            title="Snap to grid" data-snap="grid">
        <svg class="vc-icon" viewBox="0 0 24 24">
            <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
    </button>
    <button class="vc-quickbar-btn vc-toggle-btn" id="qbSnapGeo"
            title="Snap to objects / geometry" data-snap="geometry">
        <svg class="vc-icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <circle cx="4" cy="4" r="2" fill="currentColor"/>
            <circle cx="20" cy="4" r="2" fill="currentColor"/>
            <circle cx="4" cy="20" r="2" fill="currentColor"/>
            <circle cx="20" cy="20" r="2" fill="currentColor"/>
            <line x1="4" y1="4" x2="12" y2="12" stroke-dasharray="2 2"/>
        </svg>
    </button>
    <button class="vc-quickbar-btn vc-toggle-btn active" id="qbSnapNone"
            title="No snapping" data-snap="none">
        <svg class="vc-icon" viewBox="0 0 24 24">
            <line x1="4" y1="4" x2="20" y2="20"/>
            <line x1="20" y1="4" x2="4" y2="20"/>
        </svg>
    </button>
</div>
<div class="vc-quickbar-divider"></div>
```

**Group 3 — Quick draw colour** (colour swatch + opacity):

```html
<div class="vc-quickbar-group" title="Drawing colour">
    <!-- Stroke swatch -->
    <button class="vc-quickbar-btn" id="qbStrokeColor"
            title="Stroke colour (click to pick)"
            style="padding:3px;">
        <div id="qbStrokePreview"
             style="width:18px;height:18px;border-radius:3px;border:2px solid #fff;
                    background:#007acc;"></div>
    </button>
    <!-- Fill swatch -->
    <button class="vc-quickbar-btn" id="qbFillColor"
            title="Fill colour (click to pick)"
            style="padding:3px;">
        <div id="qbFillPreview"
             style="width:18px;height:18px;border-radius:3px;border:2px solid rgba(255,255,255,0.4);
                    background:transparent;background-image:linear-gradient(45deg,#555 25%,transparent 25%,transparent 75%,#555 75%),linear-gradient(45deg,#555 25%,transparent 25%,transparent 75%,#555 75%);
                    background-size:6px 6px;background-position:0 0,3px 3px;"></div>
    </button>
</div>
```

**C. Implement quickbar behaviour in `quickbar.js`**

Add a `bindToolBehaviourControls()` method to `QuickbarController` and call it from `bindEvents()`:

```js
bindToolBehaviourControls() {
    // --- Selection mode ---
    document.querySelectorAll('[data-sel-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-sel-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Expose globally so select.js can read it
            window.__vcSelectionMode = btn.dataset.selMode; // 'rect' | 'lasso'
        });
    });

    // --- Snap mode ---
    document.querySelectorAll('[data-snap]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-snap]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.__vcSnapMode = btn.dataset.snap; // 'grid' | 'geometry' | 'none'
            // Persist so camera/input tools can snap during drag
            events.emit('snap:changed', window.__vcSnapMode);
        });
    });

    // --- Quick colour picks ---
    const strokeBtn = document.getElementById('qbStrokeColor');
    const fillBtn   = document.getElementById('qbFillColor');

    if (strokeBtn) {
        strokeBtn.addEventListener('click', () => {
            const inp = document.createElement('input');
            inp.type  = 'color';
            inp.value = window.__vcDefaultStroke || '#007acc';
            inp.style.position = 'absolute'; inp.style.opacity = '0';
            document.body.appendChild(inp);
            inp.click();
            inp.addEventListener('input', () => {
                window.__vcDefaultStroke = inp.value;
                document.getElementById('qbStrokePreview').style.background = inp.value;
                // Apply to current selection
                const sel = this.store.getSelectedElements();
                if (sel.length > 0) {
                    this.store.commit('Change stroke', doc => {
                        sel.forEach(el => { if (doc.elements[el.id]) doc.elements[el.id].style.stroke = inp.value; });
                    });
                }
            });
            inp.addEventListener('change', () => inp.remove());
        });
    }

    if (fillBtn) {
        fillBtn.addEventListener('click', () => {
            const inp = document.createElement('input');
            inp.type  = 'color';
            inp.value = window.__vcDefaultFill || '#00000000';
            inp.style.position = 'absolute'; inp.style.opacity = '0';
            document.body.appendChild(inp);
            inp.click();
            inp.addEventListener('input', () => {
                window.__vcDefaultFill = inp.value;
                document.getElementById('qbFillPreview').style.background = inp.value;
                const sel = this.store.getSelectedElements();
                if (sel.length > 0) {
                    this.store.commit('Change fill', doc => {
                        sel.forEach(el => { if (doc.elements[el.id]) doc.elements[el.id].style.fill = inp.value; });
                    });
                }
            });
            inp.addEventListener('change', () => inp.remove());
        });
    }
}
```

**D. Wire snap mode into drawing tools**  
In `editor/js/view/input.js` (or the main event bridge), read `window.__vcSnapMode` during `pointermove`. When mode is `'grid'`, round the world point to the nearest major grid cell (default 10 mm):

```js
function applySnap(pt) {
    const mode = window.__vcSnapMode || 'none';
    if (mode === 'grid') {
        const snap = window.__vcSnapGrid || 10; // mm
        return { x: Math.round(pt.x / snap) * snap, y: Math.round(pt.y / snap) * snap };
    }
    if (mode === 'geometry') {
        // Find nearest anchor/midpoint of any element within 5mm
        // (Simple implementation: iterate store elements, return nearest corner/centre)
        return snapToGeometry(pt, store);
    }
    return pt; // 'none'
}
```

### ACCEPTANCE
- Quickbar no longer shows Rectangle, Circle, Polygon, Star, Curve, Path tool buttons. Left sidebar still shows all tools.
- Clicking the Grid snap button snaps drawing cursors to the nearest 10 mm grid point.
- Clicking Geometry snap snaps to nearest element corner or centre within 5 mm.
- Colour swatches show and change the current stroke / fill.
- All existing quickbar rotate/flip/duplicate/delete actions still work.

---

## Issue 6 — Project "Last Projects" preview on main page shows raw JSON, not an SVG thumbnail

### Current Behaviour (what is wrong)
As visible in the screenshot, the "Last Projects" card on `index.html` (line 541) displays raw JSON text instead of an SVG visual preview. The root cause is a **data-format mismatch**:

**Save path (`menubar.js` lines 85–91):**
```js
const content = this.store.doc;              // ← saves the whole JS object
storage.saveProject({
    id: Date.now(),
    name,
    content: JSON.stringify(content)         // ← serialized as JSON string
});
```

**Preview path (`index.html` line 541):**
```html
<div class="project-preview">${proj.content}</div>  <!-- expects SVG markup -->
```

`proj.content` is a **JSON string of the internal document model**, not an SVG string. Injecting it into the DOM displays the raw JSON text. Additionally, the DOM XSS risk of injecting `proj.content` with `innerHTML` is real (though in this case it is the user's own data from their own localStorage).

### Required Fix

**A. Save an SVG thumbnail alongside the JSON in `menubar.js → menuDashboardSave` handler:**

```js
this.on('menuDashboardSave', () => {
    const titleInput = document.getElementById('projectTitleInput');
    const name = titleInput?.value || 'VectorCutter Project';

    // 1. Save full document model (for re-opening)
    const docJson = JSON.stringify(this.store.doc);

    // 2. Generate SVG thumbnail for the preview card
    const svgThumb = exportSVGString(this.store);   // already imported in menubar.js

    storage.saveProject({
        id: Date.now(),
        name,
        content: docJson,       // ← full model JSON for editor re-load
        svgPreview: svgThumb    // ← SVG markup string for thumbnail
    });
    alert(`Project "${name}" saved to Dashboard!`);
});
```

**B. Render the preview with `svgPreview` in `index.html → renderProjects()`:**

```js
// CURRENT (wrong):
<div class="project-preview">${proj.content}</div>

// CORRECT:
const previewHtml = proj.svgPreview
    ? proj.svgPreview           // SVG string – renders as actual graphic
    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:11px;">No preview</div>';

card.innerHTML = `
    <div>
        <div class="project-title">${proj.name || 'Untitled Project'}</div>
        <div class="project-date">${dateStr}</div>
        <div class="project-preview">${previewHtml}</div>
    </div>
    ...
`;
```

**C. Scale the preview SVG to fill the thumbnail box:**

After inserting, force the `<svg>` to scale (the existing code at line 563–568 already does this, but keep it and ensure `viewBox` is set correctly):

```js
const svgEl = card.querySelector('.project-preview svg');
if (svgEl) {
    svgEl.setAttribute('width',  '100%');
    svgEl.setAttribute('height', '100%');
    svgEl.style.display    = 'block';
    svgEl.style.objectFit = 'contain';
    // preserveAspectRatio ensures it fits without cropping
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}
```

**D. Backward-compatibility for old saved projects**  
Old projects have `content` as an SVG string (from early builds) or JSON (from the current build). Detect and handle both:

```js
function getPreviewHtml(proj) {
    if (proj.svgPreview) return proj.svgPreview;        // new format
    if (proj.content?.startsWith('<svg')) return proj.content;  // very old format
    return '<div ...>No preview</div>';                  // JSON format - no thumb
}
```

### ACCEPTANCE
- Save a project with two rectangles via File → Save to Dashboard.
- Navigate to the main page: the project card shows an SVG miniature of the two rectangles.
- The SVG scales to fill the thumbnail box without distortion.
- Old projects without `svgPreview` show a "No preview" placeholder instead of raw text.

---

## Issue 7 — SVG export has an unnecessary margin; laser cutting files must be content-tight

### Current Behaviour (what is wrong)
In `editor/js/io/svg-export.js` lines 31–35:

```js
const margin = 5; // 5mm margin    ← HARD-CODED extra padding
const x = Math.floor(minX - margin);
const y = Math.floor(minY - margin);
const w = Math.ceil(maxX - minX + margin * 2);
const h = Math.ceil(maxY - minY + margin * 2);
```

Every exported SVG has 5 mm of whitespace around all sides. For laser cutting this is incorrect — the laser controller interprets the SVG `width`/`height` and `viewBox` as the physical work area. Extra margin:
1. Wastes material.
2. Can cause the job to exceed the bed boundary.
3. Some controllers (Lightburn, RDWorks) use the SVG bounding box to auto-home the laser, so a padded file starts the job 5 mm off.

Additionally, the bounding-box calculation is **axis-aligned only** (`tx + box.x`), not accounting for rotated elements. A rotated rectangle that extends further than its AABB will be clipped in the viewBox.

### Required Fix

**A. Remove the hard-coded `margin`; compute a tight bounding box.**

Replace lines 20–35 of `svg-export.js` with:

```js
// Compute tight, rotation-aware world-space bounding box
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

elements.forEach(el => {
    const box = getElementLocalBounds(el);
    // Transform all 4 corners through the element's full affine matrix
    const corners = [
        { x: box.x,             y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x,             y: box.y + box.height }
    ].map(c => transformPoint(el.transform, c));

    corners.forEach(c => {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x);
        maxY = Math.max(maxY, c.y);
    });
});

// Add half the maximum stroke width as the ONLY margin
// (so the stroke is not clipped at the edge)
const maxStrokeW = elements.reduce((m, el) => Math.max(m, parseFloat(el.style?.strokeWidth || 0.1)), 0.1);
const margin = maxStrokeW / 2;

const x = minX - margin;
const y = minY - margin;
const w = (maxX - minX) + margin * 2;
const h = (maxY - minY) + margin * 2;
```

**B. Import `transformPoint` at the top of `svg-export.js`** (it is already exported from `matrix.js`):

```js
import { matrixToSVGTransform, transformPoint } from '../model/matrix.js';
```

**C. Output exact decimal precision in the `width` / `height` / `viewBox` attributes** — do not use `Math.floor` / `Math.ceil` as that can add up to 1 mm of padding per side:

```js
svg += `<svg xmlns="http://www.w3.org/2000/svg" ` +
       `width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" ` +
       `viewBox="${x.toFixed(4)} ${y.toFixed(4)} ${w.toFixed(4)} ${h.toFixed(4)}">\n`;
```

**D. Keep the margin as an optional parameter** so power users can add bleed for other purposes:

```js
export function exportSVGString(store, options = {}) {
    const extraMargin = options.margin ?? 0; // default 0 for laser files
    ...
    const margin = maxStrokeW / 2 + extraMargin;
```

### ACCEPTANCE
- Draw a 100 × 50 mm rectangle with 0.1 mm stroke. Export SVG.
- Open the SVG in a text editor: `width="100.050mm"`, `height="50.050mm"`, `viewBox` matches exactly.
- No 5 mm padding visible.
- Draw the same rectangle rotated 45°. Export: viewBox covers the full rotated extent, nothing is clipped.

---

## Issue 8 — 3D Prep does not work (preview is blank, mesh fails silently)

### Symptoms
Opening the 3D PREP tab with an element selected shows the panel UI but:
- The Three.js preview canvas either stays black or shows only the grid/axes without a mesh.
- No error is visible to the user.
- Clicking export buttons with no mesh produces no file.

### Root Causes (found by code review)

**A. `initPreview()` is called before the container element exists in the DOM**  
In `panel.js → render()` (line 189), `this.initPreview()` is called immediately after `this.container.innerHTML = ...`. However, `#vc3DPreviewWrap` is part of the new innerHTML, so it must be queried **after** the assignment. The likely failure:

```js
// panel.js → initPreview()
initPreview() {
    const wrap = this.container.querySelector('#vc3DPreviewWrap');
    // If called before innerHTML is set, wrap === null
    // → Preview3D constructor receives null container → never initialises
    if (this.preview) this.preview.dispose();
    this.preview = new Preview3D(wrap);
}
```

Confirm with: add `console.log('wrap:', wrap)` after the querySelector — if it logs `null`, this is the bug.

**Fix:** Ensure `initPreview()` is always called after `this.container.innerHTML =` is fully executed (it already is on line 189 — the innerHTML string assignment on lines 59–187 finishes before `initPreview()` on line 189). The real issue is that `Preview3D.init()` calls `window.THREE` and if Three.js hasn't loaded yet, `init()` returns silently.

**B. `THREE` is not guaranteed to be available as `window.THREE`**  
Three.js is loaded via `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` which puts it on `window.THREE`. But the 3D panel initialises on the first tab-click, which may happen before the CDN script finishes loading (slow connections). `Preview3D.init()` guards with `if (!window.THREE || !this.container) return;` — this silently returns and never retries.

**Fix:** Add a `waitForThree()` async helper and await it in `initPreview()`:

```js
// In preview.js
async function waitForThree(timeoutMs = 5000) {
    if (window.THREE) return true;
    return new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            if (window.THREE) return resolve(true);
            if (Date.now() - start > timeoutMs) return resolve(false);
            requestAnimationFrame(check);
        };
        check();
    });
}

// In Preview3D constructor / init():
async init() {
    const ok = await waitForThree();
    if (!ok) {
        console.error('[3D Preview] THREE.js not available after 5 s');
        if (this.container) {
            this.container.innerHTML = '<div style="color:#f55;padding:12px;font-size:11px;">WebGL / Three.js unavailable. 3D preview disabled.</div>';
        }
        return;
    }
    // ... existing init code
}
```

**C. `rebuildMesh()` uses `await extractElementRings(el)` but `initPreview()` is not awaited**  
`panel.js → render()` calls `initPreview()` synchronously (line 189) then `bindEvents()` (line 190) then `rebuildMesh()` (line 191). `rebuildMesh()` calls `this.preview.updateMesh(mesh, color)` — but if `initPreview()` has not finished (it is async now), `this.preview` is still the old instance or null.

**Fix:** Make `render()` async and `await this.initPreview()`:

```js
async render() {
    if (!this.container) return;
    // ... existing innerHTML setup
    await this.initPreview();
    this.bindEvents();
    await this.rebuildMesh();
}
```

**D. `extractElementRings()` returns plain arrays, but `modes.js` expects objects with `.isCCW` and `.points` fields**  
In `geometry.js`, `extractElementRings()` builds `rawRings` as `{ points, isCCW, isHole }` objects but the actual return statement (which you must verify in the full file) may return just `rawRings` without computing `isCCW` for each ring. In `modes.js` line 27–28:

```js
const outerRings = rings.filter(r => r.isCCW).map(r => r.points);
const holeRings  = rings.filter(r => !r.isCCW).map(r => r.points);
```

If `isCCW` is never set, `outerRings` is always empty, and the fallback on line 29–31 uses `rings[0].points` which may be `undefined` if `rings[0]` is a plain array.

**Fix:** In `geometry.js`, ensure every returned ring object has the form `{ points: [...], isCCW: boolean }`. Add `computeSignedArea()` for each raw ring and set `isCCW = signedArea < 0` (SVG Y-axis is inverted):

```js
function signedArea(pts) {
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
    }
    return area / 2;
}
// When building rawRings:
rawRings.push({ points: pts, isCCW: signedArea(pts) < 0 });
```

**E. `Preview3D.updateMesh()` disposes the old geometry but may throw if `this.mesh === null` on the first call**  
Confirm `updateMesh()` guards `if (this.mesh)` before calling `.geometry.dispose()`.

### ACCEPTANCE
- Select a rectangle. Click 3D PREP tab.
- After ≤ 2 s: a 3D box appears in the preview viewport. No black screen.
- Change Height to 20: the mesh updates within 200 ms.
- Select Taper In, angle 15°: top face is visibly smaller.
- Export STL (Binary): a valid binary STL file downloads, importable in PrusaSlicer / Cura.
- If WebGL is unavailable: a plain-text error message is shown, not a crash.

---

## Issue 9 — Imported SVG shapes (Browse Library / templates) are not resizable or rotatable

### Symptom
When a shape is loaded from Browse Shape Library (e.g. "Leather Badge", "5-Point Star") or any preset path, clicking it selects it but the **resize and rotation handles do not appear**, and dragging does not move it. The shape appears frozen.

### Root Cause
In `modals.js → showShapeLibrary()` (lines 86–96), preset shapes are created with `createElement('path', { d: p.d, ... })`. In `editor/js/model/elements.js`, `createElement` must assign a valid `transform` (the identity matrix `[1,0,0,1,0,0]`).

For templates loaded via `importSVGString()`, the SVG importer (`svg-import.js`) parses `<path>` elements and may not apply the element's existing `transform="matrix(...)"` attribute, leaving `el.transform` as `undefined` or `null`.

The hit-test in `select.js → hitTest()` reads `item.transform[4]` and `item.transform[5]`. If `el.transform` is `null`, this throws `TypeError: Cannot read properties of null` which is swallowed silently, causing the element to be skipped in hit-testing (never selectable).

**Check 1:** In `elements.js`, confirm `createElement` always sets `transform`:
```js
export function createElement(type, props = {}) {
    return {
        id: generateId(),
        type,
        transform: props.transform || [1, 0, 0, 1, 0, 0],  // ← MUST exist
        geometry: { ...props },
        style: { fill: 'none', stroke: '#007acc', strokeWidth: 0.5, ...props.style },
        laser: { op: 'cut', ...props.laser },
        visible: true,
        locked: false,
        name: props.name || type,
        params: props.params || null
    };
}
```

**Check 2:** In `svg-import.js`, when importing a `<path>` from an SVG file, ensure the `transform` attribute is parsed and stored:

```js
// CURRENT (suspected missing):
el.transform = [1, 0, 0, 1, 0, 0]; // may ignore the SVG transform="" attribute

// CORRECT: parse the matrix from the SVG element's transform attribute
function parseSVGTransform(transformStr) {
    if (!transformStr) return [1, 0, 0, 1, 0, 0];
    const m = transformStr.match(/matrix\(([^)]+)\)/);
    if (m) {
        const vals = m[1].split(/[\s,]+/).map(Number);
        if (vals.length === 6) return vals;
    }
    const t = transformStr.match(/translate\(([^)]+)\)/);
    if (t) {
        const [tx, ty = 0] = t[1].split(/[\s,]+/).map(Number);
        return [1, 0, 0, 1, tx, ty];
    }
    return [1, 0, 0, 1, 0, 0];
}
```

**Check 3:** Add a null-safety guard in `select.js → hitTest()` to prevent the silent throw:

```js
for (const id of order) {
    const item = this.store.getElement(id);
    if (!item || item.visible === false || item.locked) continue;
    if (!item.transform || !Array.isArray(item.transform)) continue; // ← guard
    ...
}
```

**Check 4:** In `getElementLocalBounds()` (`bounds.js`), paths imported from templates use `d` strings with absolute coordinates (e.g. `M 50 15 C 35 -5 ...`). The existing `parsePathBounds()` reads pairs of numbers from the `d` string — this is correct but it misinterprets **command letters** and **implicit repeats**. For the library shapes (which are all within a 0–100 viewBox), this is acceptable. However if the imported SVG has a `viewBox` transform applied, the coordinates will be in viewBox space, not in mm. The `svg-import.js` MUST apply the viewBox-to-mm transform when importing.

### ACCEPTANCE
- Open Shape Library → click "Leather Badge": it appears on canvas.
- Click it: selection handles appear (8 resize handles + rotation handle above).
- Drag a corner handle: the shape resizes.
- Drag the rotation handle: the shape rotates.
- Same for all 6 preset shapes and all 5 template SVGs.

---

## Non-functional requirements

- **Performance:** Node handle rendering MUST batch all handle SVG elements into a single update per `requestRender()` call, not one DOM write per handle.
- **Undo granularity:** Each completed freehand stroke is **one** undo step. Each node drag is **one** undo step (committed on `pointerup`, not on every `pointermove`). Rotation-centre edits are **one** undo step.
- **Error handling:** Wrap all tool event handlers in try/catch; log to console and show a dismissible toast on failure. Never leave the UI in a half-state (e.g. a preview element leaked into the document).
- **Accessibility:** New context-menu items and sub-panels have `role`, `aria-label`, and are keyboard-navigable.

---

## Implementation order (minimise risk)

1. **Bug 1 & 3 (same fix):** Fix `transformPoint` arg order in `select.js → captureInitialState()`. Run all acceptance tests.  
2. **Bug 2:** Fix rotation centre calc in `quickbar.js → rotateSelection()` and `flipSelection()`.  
3. **Bug 4:** Add lock guard in `select.js → onPointerDown() handle branch`; update overlay to suppress handles for locked elements.  
4. **Feature 1 (rotation centre):** Add `getRotationCentre()` helper; update `captureInitialState` and `rotateSelection` to use it; add context-menu UI; add overlay crosshair; add SVG round-trip attribute.  
5. **Feature 2 (freehand pen):** Replace `pen.js` entirely with the freehand implementation.  
6. **Feature 3 (curve editing):** Rewrite `node.js` as a state machine; extend overlay renderer for node handles.  
7. **Self-check:** Run the ACCEPTANCE tests for each section above; mark PASS / FAIL in a comment at the end of your answer.

---

## 9. Final self-check (output this list with PASS/FAIL after the code)

**Bugs from earlier session (Issues 1–4):**
1. [ ] Clicking any shape (including rotated ones) selects it correctly.  
2. [ ] Rotation toolbar buttons rotate around the visual mass centre.  
3. [ ] Rotation grab handle works; Shift snaps to 15°.  
4. [ ] Locked objects: no resize/rotate handles; not movable via canvas.  

**Features from earlier session (Features 1–3):**
5. [ ] Default rotation centre = visual mass centre for all shapes.  
6. [ ] Custom rotation centre stored per-object; context menu "Set Rotation Centre…" works.  
7. [ ] Custom rotation centre crosshair drawn on canvas.  
8. [ ] Rotation centre survives SVG save/reload round-trip.  
9. [ ] Pen / Path tool draws freehand (hold + drag), not click-by-click.  
10. [ ] RDP simplification reduces point count without visible distortion (≤ 0.5 mm tolerance).  
11. [ ] Curve / Node tool allows interactive Bézier handle dragging.  
12. [ ] Node tool's anchor and control handle diamonds render on the overlay.  

**New issues (Issues 5–9):**
13. [ ] Quickbar no longer shows shape-switching buttons (shape selection is left-sidebar only).  
14. [ ] Quickbar shows selection-mode toggle (rectangle vs. lasso marquee).  
15. [ ] Quickbar shows snap-mode toggle (grid / geometry / none) with live effect on drawing.  
16. [ ] Quickbar shows stroke and fill colour swatches that apply immediately to selection.  
17. [ ] "Last Projects" on the main page shows an SVG thumbnail preview, not raw JSON text.  
18. [ ] Backward-compatible: old projects without `svgPreview` show a placeholder, not a crash.  
19. [ ] Exported SVG files have zero extra margin; viewBox is content-tight (stroke-width / 2 only).  
20. [ ] Exported SVG bounding box accounts for element rotation (OBB, not AABB).  
21. [ ] 3D PREP panel: Three.js mesh appears on first load without any user action after tab switch.  
22. [ ] 3D PREP: Height, Taper, Chamfer, Stepped parameter changes update the mesh within 200 ms.  
23. [ ] 3D PREP: Binary STL export downloads a valid file importable by PrusaSlicer / Cura.  
24. [ ] All imported shapes (presets and SVG templates) have valid transforms and are selectable.  
25. [ ] Imported shapes show resize and rotation handles and respond to drag operations.  
26. [ ] No features from the existing editor were removed.  
27. [ ] No horizontal scrollbar; Properties panel layout intact.  
28. [ ] All files delivered in full; no placeholders.
