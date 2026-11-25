# Contributing to VectorCutter

Welcome! We're glad you want to help improve **VectorCutter** — a free, open-source, 100% client-side SVG vector editor and parametric generator toolkit built for laser cutting, CNC, and precision making.

Before submitting a contribution, please read our **[Contributor License Agreement (CLA)](CLA.md)** and the guidelines below.

---

## 📜 Contributor License Agreement (CLA)

By contributing to this repository, you agree to the terms in **[CLA.md](CLA.md)**:
- **Old Lane 17** retains ownership of the original codebase and project.
- You grant **Old Lane 17** a perpetual, royalty-free license to use, host, and distribute your contribution under the **[MIT License](LICENSE)**.
- VectorCutter is committed to staying **open source**, and we are **open to sponsorships**.
- If ads are placed on the site or the site is ever sold, contributors will receive **acknowledgment**, though **no financial payout or revenue share is guaranteed** due to the difficulty of determining an exact fair share.

---

## 🚀 Getting Started (Zero-Build Setup)

VectorCutter uses **pure HTML, CSS, and vanilla ES Modules** — there is no bundler, no `npm install`, and no build step.

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/VectorCutter.git
   cd VectorCutter
   ```

2. **Run a Local Static Server**
   ES modules require HTTP(S) rather than `file://`. Start any local static server in the repo root:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
   Then open `http://localhost:8080/editor.html` (or the port shown by your server) in your browser.

---

## 🧩 Project Structure

```text
VectorCutter/
├── index.html                  # Homepage & saved local projects dashboard
├── editor.html                 # Main SVG / Laser / 3D Prep editor shell
├── editor/
│   ├── css/                    # Design tokens (tokens.css) and layout (layout.css)
│   └── js/
│       ├── main.js             # App entry point & event wiring
│       ├── core/               # Store, Undo/Redo history, commands, scheduler, storage
│       ├── model/              # Document schema, element factory, matrices, bounds, units
│       ├── view/               # Camera, adaptive grid, SVG scene, overlay & handles
│       ├── tools/              # Select, Pan, Rect, Circle, Ellipse, Polygon, Star, Line, Pen, Node, Text
│       ├── ui/                 # Menubar, Sidebar, Quickbar, Properties, Modals, Theme
│       ├── io/                 # SVG import/export, DXF export, PNG export, Image trace
│       ├── ops/                # Boolean operations, kerf offset, repeat patterns
│       ├── laser/              # Laser prep checks, operations, cut ordering
│       └── 3d/                 # Three.js 3D extrusion preview & binary STL export
├── chessboard.html             # Parametric generator pages (chessboard, ruler, puzzle, etc.)
├── components/                 # Shared <site-header> and <site-footer> web components
└── templates/                  # Built-in SVG templates
```

---

## 🛠️ Contribution Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Follow Code & Design Conventions**
   - **Vanilla ES Modules only** — do not introduce build tools or heavy frameworks unless discussed first.
   - **World Units in Millimetres (`mm`)** — internal geometry and transforms operate in `mm`; convert to display units only at the UI boundary via `editor/js/model/units.js`.
   - **Use `store.dispatch(...)` / `store.commit(...)`** — ensure all document mutations support Undo/Redo (`Ctrl+Z` / `Ctrl+M` / `Ctrl+Y`).
   - **Keep UI clean & responsive** — verify both Dark and Light themes work properly.

3. **Test Your Changes**
   - Syntax-check modified JS files with Node:
     ```bash
     node --check editor/js/main.js
     ```
   - Open the editor in your browser and verify in DevTools Console that there are **zero JavaScript errors**.
   - Test undo/redo, SVG export, and selection/transform behaviour if you touched editor internals.

4. **Commit & Push**
   ```bash
   git add -A
   git commit -m "feat: describe your change concisely"
   git push origin feat/my-feature
   ```

5. **Open a Pull Request**
   - Go to [github.com/oldlane17/VectorCutter](https://github.com/oldlane17/VectorCutter) and click **Compare & pull request**.
   - Fill out the PR template, include screenshots for UI changes, and confirm acceptance of the **[CLA](CLA.md)**.

---

## 💖 Sponsorships & Ideas

- **Sponsorships:** Interested in sponsoring VectorCutter? Contact **Old Lane 17** via [oldlane17.com](https://oldlane17.com) or open a GitHub issue.
- **Ideas:** Looking for something to work on? Check the ideas list in [`README.md`](README.md#-exciting-ideas-for-contributions) (new SVG templates, parametric generators, editor tools, translations, and bug fixes).
