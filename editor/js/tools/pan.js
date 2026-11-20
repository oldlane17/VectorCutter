/**
 * VectorCutter - Pan Tool
 */

export class PanTool {
    constructor(camera) {
        this.camera = camera;
        this.isPanning = false;
        this.lastPt = { x: 0, y: 0 };
    }

    onPointerDown(pt, e) {
        this.isPanning = true;
        this.lastPt = { x: e.clientX, y: e.clientY };
    }

    onPointerMove(pt, e) {
        if (!this.isPanning) return;
        const dx = e.clientX - this.lastPt.x;
        const dy = e.clientY - this.lastPt.y;
        this.camera.panBy(dx, dy);
        this.lastPt = { x: e.clientX, y: e.clientY };
    }

    onPointerUp() {
        this.isPanning = false;
    }
}
