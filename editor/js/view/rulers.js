/**
 * VectorCutter - Top & Left Rulers (Screen-Space Canvas)
 */

export class RulersRenderer {
    constructor(topCanvas, leftCanvas) {
        this.topCanvas = topCanvas;
        this.leftCanvas = leftCanvas;
        this.topCtx = topCanvas?.getContext('2d');
        this.leftCtx = leftCanvas?.getContext('2d');
        this.size = 20; // ruler width/height in px
    }

    render(camera, isDarkTheme = true) {
        if (!this.topCtx || !this.leftCtx) return;

        const topW = this.topCanvas.width;
        const leftH = this.leftCanvas.height;

        this.topCtx.clearRect(0, 0, topW, this.size);
        this.leftCtx.clearRect(0, 0, this.size, leftH);

        const bgColor = isDarkTheme ? '#252526' : '#f0f0f0';
        const lineColor = isDarkTheme ? '#555555' : '#cccccc';
        const textColor = isDarkTheme ? '#888888' : '#666666';

        // Backgrounds
        this.topCtx.fillStyle = bgColor;
        this.topCtx.fillRect(0, 0, topW, this.size);
        this.leftCtx.fillStyle = bgColor;
        this.leftCtx.fillRect(0, 0, this.size, leftH);

        // Major tick interval (10mm or adaptive)
        const stepMm = camera.scale > 5 ? 5 : (camera.scale > 2 ? 10 : 50);
        const stepPx = stepMm * camera.scale;

        const origin = camera.toScreen(0, 0);

        this.topCtx.strokeStyle = lineColor;
        this.topCtx.fillStyle = textColor;
        this.topCtx.font = '9px sans-serif';

        this.leftCtx.strokeStyle = lineColor;
        this.leftCtx.fillStyle = textColor;
        this.leftCtx.font = '9px sans-serif';

        // Top ruler ticks
        const startX = (origin.x % stepPx + stepPx) % stepPx;
        for (let x = startX; x <= topW; x += stepPx) {
            const worldVal = Math.round(camera.toWorld(x, 0).x / stepMm) * stepMm;
            this.topCtx.beginPath();
            this.topCtx.moveTo(x + 0.5, this.size - 8);
            this.topCtx.lineTo(x + 0.5, this.size);
            this.topCtx.stroke();
            this.topCtx.fillText(`${worldVal}`, x + 2, this.size - 10);
        }

        // Left ruler ticks
        const startY = (origin.y % stepPx + stepPx) % stepPx;
        for (let y = startY; y <= leftH; y += stepPx) {
            const worldVal = Math.round(camera.toWorld(0, y).y / stepMm) * stepMm;
            this.leftCtx.beginPath();
            this.leftCtx.moveTo(this.size - 8, y + 0.5);
            this.leftCtx.lineTo(this.size, y + 0.5);
            this.leftCtx.stroke();

            this.leftCtx.save();
            this.leftCtx.translate(this.size - 10, y - 2);
            this.leftCtx.rotate(-Math.PI / 2);
            this.leftCtx.fillText(`${worldVal}`, 0, 0);
            this.leftCtx.restore();
        }
    }
}
