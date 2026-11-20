/**
 * VectorCutter - High-Res PNG Exporter
 * Self-contained without external module dependencies.
 */

export function downloadPNG(storeOrSvg, filename = 'vectorcutter.png') {
    let svgStr = '';
    if (typeof storeOrSvg === 'string') {
        svgStr = storeOrSvg;
    } else if (storeOrSvg && storeOrSvg.doc) {
        // Fallback simple SVG serialization if store is passed
        const el = document.getElementById('artworkSvg');
        svgStr = el ? new XMLSerializer().serializeToString(el) : '';
    }

    if (!svgStr) return;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2x high-resolution
        canvas.width = (img.width || 800) * scale;
        canvas.height = (img.height || 600) * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    img.src = url;
}

export function generatePureSVG() {
    return '';
}
