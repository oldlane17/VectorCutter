/**
 * VectorCutter - Dynamic Rotated Cursors
 * Generates exact SVG data-URI double-sided resize cursors rotated to the element's actual screen angle.
 */

const cursorCache = new Map();

export function getRotatedResizeCursor(angleDeg) {
    // Snap to 15 degree increments for crisp rendering and caching
    const snapped = (Math.round(angleDeg / 15) * 15 + 360) % 360;
    if (cursorCache.has(snapped)) {
        return cursorCache.get(snapped);
    }

    // SVG 24x24 canvas with a clean double-headed arrow along X axis, rotated by snapped angle
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <g transform="rotate(${snapped} 12 12)">
    <!-- White drop-shadow / outline for contrast on any background -->
    <path d="M 4 12 L 8 8 L 8 10.5 L 16 10.5 L 16 8 L 20 12 L 16 16 L 16 13.5 L 8 13.5 L 8 16 Z" 
          fill="none" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"/>
    <!-- Crisp white arrow body -->
    <path d="M 4 12 L 8 8 L 8 10.5 L 16 10.5 L 16 8 L 20 12 L 16 16 L 16 13.5 L 8 13.5 L 8 16 Z" 
          fill="#ffffff" stroke="#ffffff" stroke-width="0.5"/>
  </g>
</svg>`.trim();

    const uri = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 12 12, auto`;
    cursorCache.set(snapped, uri);
    return uri;
}
