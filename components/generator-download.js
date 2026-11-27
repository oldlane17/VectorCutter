/**
 * VectorCutter - Standardized Generator Download Bar
 * Renders a unified filename input + dedicated Download SVG button below #preview-container.
 */
(function () {
    window.setGeneratorDownload = function (svgString, defaultBaseName) {
        window.__vcGeneratedSVG = svgString;

        let area = document.getElementById('download-area');
        if (!area) {
            const preview = document.getElementById('preview-container');
            if (!preview) return;
            area = document.createElement('div');
            area.id = 'download-area';
            preview.insertAdjacentElement('afterend', area);
        }

        area.style.display = 'flex';
        area.className = 'vc-download-bar-container';

        let input = document.getElementById('vc-filename-input');
        let btn = document.getElementById('vc-download-btn');

        if (!input || !btn) {
            area.innerHTML = `
                <div class="vc-download-bar">
                    <label class="vc-filename-label" for="vc-filename-input">File Name:</label>
                    <div class="vc-filename-wrap">
                        <input type="text" id="vc-filename-input" class="vc-filename-input" value="${defaultBaseName}" placeholder="Enter filename...">
                        <span class="vc-filename-ext">.svg</span>
                    </div>
                    <button type="button" id="vc-download-btn" class="vc-download-btn">⬇ Download SVG</button>
                </div>
            `;
            input = document.getElementById('vc-filename-input');
            btn = document.getElementById('vc-download-btn');

            btn.addEventListener('click', function () {
                const svg = window.__vcGeneratedSVG;
                if (!svg) return;
                let rawName = (input.value || defaultBaseName).trim();
                rawName = rawName.replace(/\.svg$/i, '') || defaultBaseName;
                const finalName = rawName + '.svg';

                const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = finalName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        }
    };
})();
