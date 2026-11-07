<p align="center">
  <img src="favicon.png" alt="VectorCutter Logo" width="80"/>
</p>

<h1 align="center">VectorCutter</h1>

<p align="center">
  A free, browser-based SVG toolkit built for laser cutting and CNC work.<br/>
  Draw, generate, and export precision SVG files — no installation required.
</p>

<p align="center">
  <a href="https://vectorcutter.oldlane17.com">🌐 Live Site</a> ·
  <a href="#tools">🧰 Tools</a> ·
  <a href="#getting-started">🚀 Getting Started</a> ·
  <a href="#contributing">🤝 Contributing</a> ·
  <a href="#license">📄 License</a>
</p>

---

## Overview

**VectorCutter** is a collection of purpose-built, client-side HTML tools for creating laser-cut-ready SVG files. Everything runs in the browser — there's no backend, no login, and no data leaves your machine.

The project is part of [Old Lane 17](https://oldlane17.com), a platform for purposeful education and practical making.

---

## Tools

| Tool | File | Description |
|------|------|-------------|
| **SVG Editor** | [`editor_5.8.html`](editor_5.8.html) | Full-featured vector editor with LaTeX/MathJax text, paths, shapes, snapping, templates, and SVG export |
| **Chessboard Generator** | [`chessboard.html`](chessboard.html) | Generate laser-ready SVG chessboards with custom square size, notation, and board dimensions |
| **Ruler Generator** | [`ruler.html`](ruler.html) | Create metric or imperial SVG rulers with configurable tick spacing and engraving labels |
| **Puzzle Generator** | [`puzzle.html`](puzzle.html) | Generate interlocking jigsaw puzzle SVGs with custom tab shapes for laser cutting |
| **Advent Calendar** | [`advent_calendar.html`](advent_calendar.html) | Build advent calendar door layouts as SVG for laser engraving |
| **Popup Card Generator** | [`popup.html`](popup.html) | Design and export popup card mechanisms as flat SVG cut files |
| **Landing Page** | [`index.html`](index.html) | Project homepage |

---

## Getting Started

### Option 1 — Open directly in your browser

This project is **100% static HTML**. Just clone or download the repo and open any `.html` file in your browser:

```bash
git clone https://github.com/YOUR_USERNAME/vectorcutter.git
cd vectorcutter
# Then open index.html in your browser
```

> **No build step, no npm install, no server required.**

### Option 2 — Serve locally (recommended for best results)

Some browser security policies restrict local file access. A simple local server avoids this:

**Using Python:**
```bash
# Python 3
python -m http.server 8080
# Then visit http://localhost:8080
```

**Using Node.js (`npx`):**
```bash
npx serve .
```

**Using VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension and click **Go Live**.

### Option 3 — Deploy to a static host

Since there's no backend, you can deploy directly to:

- **GitHub Pages** — push to `main`, enable Pages in repo settings, set source to root `/`
- **Netlify** — drag and drop the folder onto [app.netlify.com](https://app.netlify.com)
- **Vercel** — `vercel --prod` from the project root
- **Any web host** — upload all files via FTP/SFTP

---

## Project Structure

```
vectorcutter/
├── index.html                # Landing page
├── editor_5.8.html           # SVG Editor (main tool)
├── chessboard.html           # Chessboard Generator
├── ruler.html                # Ruler Generator
├── puzzle.html               # Puzzle Generator
├── advent_calendar.html      # Advent Calendar Generator
├── popup.html                # Popup Card Generator
├── about.html                # About page
├── legal-notice.html         # Legal notice
├── privacy-policies.html     # Privacy policy
├── terms-of-service.html     # Terms of service
├── robots.txt                # SEO robots configuration
├── sitemap.xml               # Sitemap
├── ads.txt                   # Ads.txt
├── favicon.ico               # Favicon
├── favicon.png               # Favicon (PNG)
├── sidebar/                  # SVG icons used by the editor sidebar
│   ├── circle.svg
│   ├── rectangle.svg
│   ├── path.svg
│   └── ...
├── templates/                # Starter SVG templates for the editor
│   ├── 5_star.svg
│   ├── leather_badge.svg
│   └── ...
└── lashes/                   # Decorative SVG assets
    └── lash1.svg
```

---

## Features

### SVG Editor (`editor_5.8.html`)
- Draw rectangles, ellipses, lines, paths, and curves
- **LaTeX / MathJax support** — type math expressions and render them as SVG text
- Snap-to-grid and snap-to-object
- Pan and zoom
- Load and save templates
- Export clean SVG files ready for laser cutters (Lightburn, RDWorks, etc.)
- Code view — edit raw SVG source directly

### Generators
- **Chessboard** — set square size in mm, board dimensions, optional notation labels
- **Ruler** — metric (mm/cm) or imperial (inches), custom length, fine/coarse tick control
- **Puzzle** — set grid size, piece dimensions, and tab style; exports interlocking paths
- **Advent Calendar** — configure door count and layout; exports numbered door outlines
- **Popup Card** — design layered popup mechanisms; exports flat cut files

---

## External Dependencies

All dependencies are loaded from CDN — no local package management needed:

| Library | Used in | Purpose |
|---------|---------|---------|
| [MathJax 3](https://www.mathjax.org/) | Editor, Chessboard, Ruler | LaTeX math rendering to SVG |
| [Google Fonts – Roboto](https://fonts.google.com/) | All pages | UI typography |

> **Privacy note:** Google Fonts and MathJax CDN requests are made client-side. If you self-host, replace the CDN links with local copies.

---

## Customising the Google Tag Manager ID

The project ships with a GTM container ID (`GTM-M8HF2H2T`). If you fork this repo for your own use, replace that ID with your own GTM container or remove the GTM snippet entirely from each HTML file.

---

## Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make your changes** — all tools are self-contained HTML files
4. **Test locally** using the Python or Node server described above
5. **Commit**: `git commit -m "feat: add my feature"`
6. **Push**: `git push origin feature/my-feature`
7. **Open a Pull Request** against `main`

### Ideas for contributions
- New SVG generator tools
- Improved mobile layouts
- Accessibility improvements (ARIA labels, keyboard navigation)
- Self-hosted font/MathJax bundles
- Dark/light theme toggle for the generators

---

## License

This project is licensed under the **MIT License** — see [`LICENSE`](LICENSE) for details.

---

<p align="center">Made with ❤️ by <a href="https://oldlane17.com">Old Lane 17</a></p>
