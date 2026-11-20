/**
 * VectorCutter - SVG Editor Initialization & Modals
 * Module: editor-init.js
 * Description: Modal dialog listeners, clipboard helpers, URL project autoloading & DOM startup
 */

function closeModal() {
    document.getElementById('codeModal').style.display = 'none';
}

function closeAboutModal() {
    document.getElementById('aboutModal').style.display = 'none';
}

function copyCode() {
    const codeTextarea = document.getElementById('svgCode');
    codeTextarea.select();
    document.execCommand('copy');
    alert('SVG code copied to clipboard!');
}

// Close modals when clicking outside
document.getElementById('codeModal').addEventListener('click', (e) => {
    if (e.target.id === 'codeModal') {
        closeModal();
    }
});

document.getElementById('aboutModal').addEventListener('click', (e) => {
    if (e.target.id === 'aboutModal') {
        closeAboutModal();
    }
});

// Initialize the editor when page loads
function initEditorInstance() {
    if (!window.svgEditor) {
        window.svgEditor = new SVGEditor();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditorInstance);
} else {
    initEditorInstance();
}
