/**
 * VectorCutter - High-Performance Canvas Grid & Rulers
 * Draws grid and origin axes onto a canvas layer behind artwork.
 * Zero DOM line re-creation; adaptive spacing from {1, 2, 5} * 10^n mm.
 */

export class GridRenderer {
    constructor(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = this.canvas.getContext('2d');
        this.enabled = true;
    }

    resize(w, h) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.ctx.scale(dpr, dpr);
    }

    render(camera, isDarkTheme = true) {
        const w = parseFloat(this.canvas.style.width) || this.canvas.width;
        const h = parseFloat(this.canvas.style.height) || this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (!this.enabled) return;

        // Determine adaptive grid step in mm
        // Target minor step on screen: ~10 to 25 pixels
        const targetMinorPx = 14;
        const rawWorldStep = targetMinorPx / camera.scale;
        const power = Math.floor(Math.log10(rawWorldStep));
        const base = Math.pow(10, power);
        const fraction = rawWorldStep / base;

        let minorMm;
        if (fraction < 1.5) minorMm = base * 1;
        else if (fraction < 3.5) minorMm = base * 2;
        else if (fraction < 7.5) minorMm = base * 5;
        else minorMm = base * 10;

        const majorMm = minorMm * 10;

        const minorPx = minorMm * camera.scale;
        const majorPx = majorMm * camera.scale;

        // Theme colors
        const minorColor = isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
        const majorColor = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)';
        const axisColor = isDarkTheme ? '#007acc' : '#007acc';
        const labelColor = isDarkTheme ? '#666666' : '#999999';

        // World origin (0, 0) in screen coordinates
        const origin = camera.toScreen(0, 0);

        // Minor grid lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = minorColor;
        this.ctx.lineWidth = 1;

        // Vertical minors
        const startX = (origin.x % minorPx + minorPx) % minorPx;
        for (let x = startX; x <= w; x += minorPx) {
            this.ctx.moveTo(Math.round(x) + 0.5, 0);
            this.ctx.lineTo(Math.round(x) + 0.5, h);
        }

        // Horizontal minors
        const startY = (origin.y % minorPx + minorPx) % minorPx;
        for (let y = startY; y <= h; y += minorPx) {
            this.ctx.moveTo(0, Math.round(y) + 0.5);
            this.ctx.lineTo(w, Math.round(y) + 0.5);
        }
        this.ctx.stroke();

        // Major grid lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = majorColor;
        this.ctx.lineWidth = 1;

        // Vertical majors
        const majorStartX = (origin.x % majorPx + majorPx) % majorPx;
        for (let x = majorStartX; x <= w; x += majorPx) {
            this.ctx.moveTo(Math.round(x) + 0.5, 0);
            this.ctx.lineTo(Math.round(x) + 0.5, h);
        }

        // Horizontal majors
        const majorStartY = (origin.y % majorPx + majorPx) % majorPx;
        for (let y = majorStartY; y <= h; y += majorPx) {
            this.ctx.moveTo(0, Math.round(y) + 0.5);
            this.ctx.lineTo(w, Math.round(y) + 0.5);
        }
        this.ctx.stroke();

        // Primary Origin Axes (X = 0 and Y = 0)
        this.ctx.beginPath();
        this.ctx.strokeStyle = axisColor;
        this.ctx.lineWidth = 1.5;

        // Y-axis (X = 0)
        if (origin.x >= 0 && origin.x <= w) {
            this.ctx.moveTo(Math.round(origin.x) + 0.5, 0);
            this.ctx.lineTo(Math.round(origin.x) + 0.5, h);
        }
        // X-axis (Y = 0)
        if (origin.y >= 0 && origin.y <= h) {
            this.ctx.moveTo(0, Math.round(origin.y) + 0.5);
            this.ctx.lineTo(w, Math.round(origin.y) + 0.5);
        }
        this.ctx.stroke();

        // Major coordinate labels
        this.ctx.fillStyle = labelColor;
        this.ctx.font = '10px sans-serif';

        // Draw numbers along major lines
        for (let x = majorStartX; x <= w; x += majorPx) {
            const worldValMm = Math.round(camera.toWorld(x, 0).x / majorMm) * majorMm;
            if (worldValMm === 0) continue;
            const labelY = Math.max(14, Math.min(h - 4, origin.y + 12));
            this.ctx.fillText(`${worldValMm}`, x + 3, labelY);
        }

        for (let y = majorStartY; y <= h; y += majorPx) {
            const worldValMm = Math.round(camera.toWorld(0, y).y / majorMm) * majorMm;
            if (worldValMm === 0) continue;
            const labelX = Math.max(4, Math.min(w - 30, origin.x + 4));
            this.ctx.fillText(`${worldValMm}`, labelX, y - 3);
        }
    }
}
