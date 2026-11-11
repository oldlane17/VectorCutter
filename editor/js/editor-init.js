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
document.addEventListener('DOMContentLoaded', () => {
    new SVGEditor();
});


const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('pid');

if (projectId) {
const projects = JSON.parse(localStorage.getItem('vc_projects') || '[]');
const project = projects.find(p => p.id == projectId);

if (project && project.content) {
    // Assuming your editor has a method to load SVG string
    // Based on your previous code, it looks like loadSVGContent()
    this.loadSVGContent(project.content); 
    console.log("Loaded project:", project.name);
}
}
