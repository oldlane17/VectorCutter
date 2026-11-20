# VectorCutter Acceptance Audit Log

## Checklist & Verifications

- [ ] Zero console errors or unhandled exceptions on initial load.
- [ ] No third-party network requests (no Google Fonts runtime links, no jsDelivr, no external GTM).
- [ ] Camera zoom at cursor point keeps target world position fixed (< 1px drift).
- [ ] Selection handles remain constant 9px screen size at all zoom levels.
- [ ] Resize cursors dynamically follow element orientation and rotation angles.
- [ ] Document store command pipeline maintains element list, canvas, and properties synchronization.
- [ ] Dark, Light, and System themes work cleanly across all panels with zero unthemed UI elements.
- [ ] Left sidebar is resizable, searchable, collapsible to icon-only, and displays long text cleanly.
- [ ] SVG import cleanly creates native editable elements compatible with Laser Mode.
- [ ] Exported SVGs contain exact mm units with pure geometry and no UI artifacts.
- [ ] Laser Mode supports Cut, Score, Engrave, Bed Boundaries, Checks Panel, and Material Presets.
