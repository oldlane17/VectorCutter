/**
 * VectorCutter - Shared Footer Web Component
 * Usage:
 *   <script src="components/footer.js" defer></script>
 *   <site-footer></site-footer>
 */

(function () {
    // Ensure layout stylesheet is loaded
    function ensureLayoutCSS() {
        if (!document.querySelector('link[href*="layout.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'components/layout.css';
            document.head.appendChild(link);
        }
    }

    function createFooterHTML() {
        const currentYear = new Date().getFullYear();
        const yearDisplay = currentYear > 2024 ? `2024-${currentYear}` : '2024';

        return `
        <footer class="footer-row footer-row-1" role="contentinfo">
            <div class="footer-row-container" style="background-color: #182a69; width: 100%;">
                <nav aria-label="Footer Links">
                    <a href="about.html">About</a>
                    <a href="privacy-policies.html">Privacy Policies</a>
                    <a href="terms-of-service.html">Terms of Service</a>
                    <a href="legal-notice.html">Legal Notice</a>
                    <a href="https://www.oldlane17.com/p/contact.html" target="_blank" rel="noopener noreferrer">Contact</a>
                    <a href="#" data-cc="show-preferencesModal">Cookie Settings</a>
                    <a href="https://info.oldlane17.com/faq" target="_blank" rel="noopener noreferrer">FAQ</a>
                    <a href="https://info.oldlane17.com/social-media" target="_blank" rel="noopener noreferrer">Social Media</a>
                    <a href="https://github.com/oldlane17/VectorCutter" target="_blank" rel="noopener noreferrer" title="View Source on GitHub">GitHub</a>
                </nav>
            </div>
            <div class="footer-row-container" style="background-color: #02133e; width: 100%;">
                <p>© Copyright ${yearDisplay} Old Lane 17</p>
            </div>
        </footer>
        `;
    }

    // Custom Element definition
    class SiteFooter extends HTMLElement {
        connectedCallback() {
            ensureLayoutCSS();
            this.innerHTML = createFooterHTML();
        }
    }

    if (!customElements.get('site-footer')) {
        customElements.define('site-footer', SiteFooter);
    }

    // Auto-mount helper for pages with <div id="site-footer"></div>
    document.addEventListener("DOMContentLoaded", function () {
        ensureLayoutCSS();
        const placeholder = document.getElementById("site-footer");
        if (placeholder && !placeholder.querySelector('.footer-row-1')) {
            placeholder.innerHTML = createFooterHTML();
        }
    });
})();
