<p align="center">
  <img src="favicon.png" alt="VectorCutter Logo" width="80"/>
</p>

<h1 align="center">VectorCutter</h1>

<p align="center">
  <strong>A free, client-side vector SVG editor and parametric generator toolkit built for laser cutting, CNC, and precision making.</strong><br/>
  Draw, generate, and export laser-ready SVG files — 100% static, runs in the browser, no installation required.
</p>

<p align="center">
  <a href="https://vectorcutter.oldlane17.com">🌐 Live Site</a> ·
  <a href="#tools">🧰 Tools</a> ·
  <a href="#modular-architecture">🧩 Architecture</a> ·
  <a href="#cloudflare-pages-deployment">⚡ Cloudflare Pages</a> ·
  <a href="#getting-started">🚀 Getting Started</a> ·
  <a href="#contributing">🤝 Contributing</a> ·
  <a href="#license">📄 License</a>
</p>

---

## GitHub Repository Description

> **Short Description (for GitHub repo About / Description field):**  
> `A free, client-side vector SVG editor and parametric generator toolkit built for laser cutting, CNC, and precision making.`  
>  
> **Website:** `https://vectorcutter.oldlane17.com`  
> **Topics:** `svg-editor`, `laser-cutting`, `cnc`, `maker-tools`, `vector-graphics`, `mathjax`, `cloudflare-pages`

---

## Overview

**VectorCutter** is a suite of purpose-built, client-side tools for creating laser-cut-ready SVG files. Everything runs directly in the user's browser — there is no backend server, no database, no authentication, and no user data ever leaves the local machine.

The project is maintained by [Old Lane 17](https://oldlane17.com), a platform for purposeful education and practical making.

---

## Tools

| Tool | File | Description |
|------|------|-------------|
| **SVG Editor** | [`editor_5.8.html`](editor_5.8.html) / [`editor.html`](editor.html) | Full-featured vector editor with LaTeX/MathJax text, shapes, paths, snapping, laser-mode styling, templates, and SVG/PNG export |
| **Chessboard Generator** | [`chessboard.html`](chessboard.html) | Generate laser-ready SVG chessboards with custom square size, notation, and border dimensions |
| **Ruler Generator** | [`ruler.html`](ruler.html) | Create metric or imperial SVG rulers with configurable tick spacing and engraving labels |
| **Puzzle Generator** | [`puzzle.html`](puzzle.html) | Generate interlocking jigsaw puzzle SVGs with custom tab shapes for laser cutting |
| **Advent Calendar** | [`advent_calendar.html`](advent_calendar.html) | Build advent calendar door layouts as SVG for laser engraving and cutting |
| **Popup Card Generator** | [`popup.html`](popup.html) | Design and export popup card mechanisms as flat SVG cut files |
| **Landing Page** | [`index.html`](index.html) | Project dashboard showing recent projects and direct launch links |

---

## Modular Architecture

The repository is organized into distinct, modular components so that logic, styling, and navigation are easy to view, inspect, and maintain:

```
vectorcutter/
├── components/                      # Shared reusable layout components
│   ├── layout.css                  # Universal topnav & footer CSS variables and styles
│   ├── header.js                   # <site-header> Web Component (desktop nav + mobile drawer)
│   ├── footer.js                   # <site-footer> Web Component (with GitHub reference link)
│   ├── header.html                 # Raw HTML partial of top navigation
│   └── footer.html                 # Raw HTML partial of footer
├── editor/                         # Modular SVG Editor architecture
│   ├── css/
│   │   └── editor.css              # Complete editor styling (canvas, sidebar, context panel, modals)
│   └── js/
│       ├── editor-core.js          # SVGEditor class, lifecycle, undo/redo history, clipboard, shortcuts
│       ├── editor-canvas.js        # ViewBox, coordinate system, axes, grid, pan & zoom
│       ├── editor-tools.js         # Tool modes, mouse events (down/move/up), element creation
│       ├── editor-selection.js     # Marquee selection, bounding boxes, selection handles, snapping
│       ├── editor-transform.js     # Resize, rotate, scale, flip, reflect, translate, arrow keys
│       ├── editor-properties.js    # Properties panel, coordinate inputs, LaTeX MathJax rendering, styles
│       ├── editor-elements-tree.js # Elements hierarchy tree, grouping, path/group splitting
│       ├── editor-laser-mode.js    # Laser cutting mode toggle & recursive style overrides
│       ├── editor-export.js        # Clean SVG serialization, text flattening, PNG export
│       ├── editor-templates.js     # Parametric Star & N-Gon shape generators, starter SVGs
│       ├── editor-code.js          # Live SVG code viewer, code modal, two-way code updates
│       └── editor-init.js          # Modal helpers, clipboard copy, URL parameter autoloading
├── index.html                      # Landing page (uses <site-header> and <site-footer>)
├── editor_5.8.html                 # SVG Editor entrypoint (clean HTML loading editor modules)
├── editor.html                     # SVG Editor alias
├── advent_calendar.html            # Advent Calendar generator
├── chessboard.html                 # Chessboard generator
├── puzzle.html                     # Puzzle generator
├── ruler.html                      # Ruler generator
├── popup.html                      # Pop-Up Card generator
├── about.html                      # About page
├── legal-notice.html               # Legal notice
├── privacy-policies.html           # Privacy policies
├── terms-of-service.html           # Terms of service
├── wrangler.toml                   # Cloudflare Pages zero-configuration deployment manifest
├── _redirects                      # Cloudflare Pages route redirects (/editor -> /editor_5.8.html)
├── _headers                        # Cloudflare Pages caching and security headers
├── sidebar/                        # Sidebar SVG icons
├── templates/                      # Starter SVG templates
└── lashes/                         # Decorative SVG assets
```

### Shared Header & Footer Components

All standard pages import the common navigation and footer cleanly:

```html
<!-- In <head> -->
<link rel="stylesheet" href="components/layout.css">
<script src="components/header.js" defer></script>
<script src="components/footer.js" defer></script>

<!-- In <body> -->
<site-header></site-header>
...page content...
<site-footer></site-footer>
```

- **Universal Navigation:** Features home links, editor launch, generators dropdown, active link highlighting, and a responsive slide-out mobile drawer with backdrop and keyboard navigation (Esc to close).
- **Universal Footer:** Contains links to About, Privacy Policies, Terms of Service, Legal Notice, Contact, Cookie Settings, FAQ, Social Media, and links back to the **[GitHub Repository](https://github.com/oldlane17/VectorCutter)** as reference.

---

## Cloudflare Pages Deployment

This repository is configured to **automatically build and deploy with Cloudflare Pages** directly from the Git repository with **zero manual configuration**:

1. **Push to Git:** Any commit pushed to the `main` branch triggers an automated deployment.
2. **Build Settings in Cloudflare Pages:**
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `.` (root directory)
3. **Automated Configuration via `wrangler.toml`:**
   The included [`wrangler.toml`](wrangler.toml) file instructs Cloudflare Pages to serve the static assets directly from the repository root:
   ```toml
   name = "vectorcutter"
   compatibility_date = "2024-01-01"
   pages_build_output_dir = "."
   ```
4. **Clean URLs & Caching:**
   - [`_redirects`](_redirects) automatically routes `/editor` to `/editor_5.8.html`.
   - [`_headers`](_headers) sets security headers and enables 24-hour browser caching for CSS, JS, and SVG assets.

---

## Getting Started

### Option 1 — Open directly in your browser

Because VectorCutter is 100% client-side HTML, CSS, and JavaScript, you can open any `.html` file directly in a modern web browser:

```bash
git clone https://github.com/oldlane17/VectorCutter.git
cd VectorCutter
# Open index.html or editor_5.8.html in your browser
```

> **No build step, no npm install, no backend server required.**

### Option 2 — Serve locally (recommended)

A simple local HTTP server ensures smooth asset loading:

**Using Python 3:**
```bash
python -m http.server 8080
# Visit http://localhost:8080
```

**Using Node.js:**
```bash
npx serve .
```

**Using VS Code:**
Install the **Live Server** extension and click **Go Live**.

---

## Features

### SVG Editor (`editor_5.8.html`)
- **Parametric drawing:** Rectangles, ellipses, circles, lines, curves, and arbitrary paths.
- **LaTeX / MathJax text:** Render mathematical formulas and equations directly into laser-ready vector outlines.
- **Snapping & alignment:** Snap-to-grid and snap-to-object centers and edges.
- **Pan & zoom:** Infinite canvas with millimeter/inch coordinates and customizable rulers.
- **Laser Cutting Mode:** One-click conversion of fills to vector cut strokes (`#000000`, 1px stroke).
- **History:** Unlimited multi-step undo and redo (`Ctrl+Z`, `Ctrl+Y`).
- **Templates & Generators:** Built-in n-gon, regular star generators, and SVG template import.
- **Live Code Editor:** Two-way SVG source inspection and live-updating canvas.
- **Export:** High-precision clean SVG and high-resolution PNG export.

### Parametric Generators
- **Chessboard:** Configurable square sizes, border widths, algebraic notation labels, and grid coordinates.
- **Ruler:** Metric (mm, cm) and Imperial (inch) with fine/coarse sub-division ticks and customizable label engraving.
- **Puzzle:** Interlocking jigsaw puzzles with customizable rows, columns, piece sizes, and tab curves.
- **Advent Calendar:** Multi-door layout generator with numbered engraving and custom door tab margins.
- **Popup Card:** Multi-tier 3D popup card generation with mountain, valley, and cut paths.

---

## Contributing

Contributions are welcome!

1. **Fork** the repository: `https://github.com/oldlane17/VectorCutter`
2. **Create a branch**: `git checkout -b feature/my-new-feature`
3. **Make your changes** — modular logic is in `editor/` and layout components in `components/`.
4. **Test locally** with a local HTTP server.
5. **Commit**: `git commit -m "feat: describe your change"`
6. **Push**: `git push origin feature/my-new-feature`
7. **Open a Pull Request** against `main`.

---

## License

This project is open-source under the **[MIT License](LICENSE)**.

---

<p align="center">Made with ❤️ by <a href="https://oldlane17.com">Old Lane 17</a></p>
