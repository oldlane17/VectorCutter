/**
 * VectorCutter - Shared Header Web Component
 * Usage:
 *   <script src="components/header.js" defer></script>
 *   <site-header></site-header>
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

    // Determine current active page for navigation highlight
    function getActivePage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return page.toLowerCase();
    }

    function createHeaderHTML() {
        const active = getActivePage();
        const isHome = active === 'index.html' || active === '';
        const isEditor = active.includes('editor');
        const isAdvent = active === 'advent_calendar.html';
        const isChessboard = active === 'chessboard.html';
        const isPuzzle = active === 'puzzle.html';
        const isRuler = active === 'ruler.html';
        const isPopup = active === 'popup.html';

        return `
        <!-- Backdrop for Mobile Drawer -->
        <div id="siteNavBackdrop" class="sidenav-backdrop" onclick="closeNav()"></div>

        <!-- Mobile Sidenav Drawer -->
        <div id="mySidenav" class="sidenav" role="navigation" aria-label="Mobile Navigation">
            <a href="javascript:void(0)" class="closebtn" onclick="closeNav()" aria-label="Close menu">&times;</a>
            <a href="index.html" class="${isHome ? 'active' : ''}">Home</a>
            <a href="editor.html" target="_blank" class="${isEditor ? 'active' : ''}">Editor</a>
            <div class="sidenav-divider"></div>
            <span class="sidenav-header" style="color:#aaa; font-size:0.9rem; padding-left:32px;">GENERATORS</span>
            <a href="advent_calendar.html" class="sidenav-subitem ${isAdvent ? 'active' : ''}">Advent Calendar</a>
            <a href="chessboard.html" class="sidenav-subitem ${isChessboard ? 'active' : ''}">Chessboard</a>
            <a href="puzzle.html" class="sidenav-subitem ${isPuzzle ? 'active' : ''}">Puzzle</a>
            <a href="ruler.html" class="sidenav-subitem ${isRuler ? 'active' : ''}">Ruler Generator</a>
            <a href="popup.html" class="sidenav-subitem ${isPopup ? 'active' : ''}">Pop-Up Card</a>
        </div>

        <!-- Desktop & Main Top Navigation Bar -->
        <nav class="topnav" role="navigation" aria-label="Main Navigation">
            <span class="hamburger" onclick="openNav()" aria-label="Open mobile menu" role="button" tabindex="0">&#9776;</span>

            <div class="nav-left">
                <a href="index.html" style="display:flex; align-items:center; text-decoration:none; gap:15px;">
                    <img src="favicon.png" alt="VectorCutter Logo" class="nav-logo" onerror="this.style.display='none'">
                    <span class="nav-title">VectorCutter - Old Lane 17</span>
                </a>
            </div>

            <div class="nav-right">
                <a href="index.html" class="${isHome ? 'active' : ''}">Home</a>
                <a href="editor.html" target="_blank" class="${isEditor ? 'active' : ''}">Editor</a>
                <div class="dropdown">
                    <button class="dropbtn" aria-haspopup="true" aria-expanded="false">Generators ▼</button>
                    <div class="dropdown-content" role="menu">
                        <a href="advent_calendar.html" target="_blank" role="menuitem">Advent Calendar</a>
                        <a href="chessboard.html" target="_blank" role="menuitem">Chessboard</a>
                        <a href="puzzle.html" target="_blank" role="menuitem">Puzzle</a>
                        <a href="ruler.html" target="_blank" role="menuitem">Ruler</a>
                        <a href="popup.html" target="_blank" role="menuitem">Pop-Up Card</a>
                    </div>
                </div>
            </div>
        </nav>
        `;
    }

    // Global navigation handlers for backwards compatibility & accessibility
    window.openNav = function () {
        const sideNav = document.getElementById("mySidenav");
        const backdrop = document.getElementById("siteNavBackdrop");
        if (sideNav) sideNav.style.width = "270px";
        if (backdrop) backdrop.classList.add("active");
    };

    window.closeNav = function () {
        const sideNav = document.getElementById("mySidenav");
        const backdrop = document.getElementById("siteNavBackdrop");
        if (sideNav) sideNav.style.width = "0";
        if (backdrop) backdrop.classList.remove("active");
    };

    // Close mobile nav on Escape key
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            window.closeNav();
        }
    });

    // Custom Element definition
    class SiteHeader extends HTMLElement {
        connectedCallback() {
            ensureLayoutCSS();
            this.innerHTML = createHeaderHTML();
        }
    }

    if (!customElements.get('site-header')) {
        customElements.define('site-header', SiteHeader);
    }

    // Auto-mount helper for pages with <div id="site-header"></div> or direct import
    document.addEventListener("DOMContentLoaded", function () {
        ensureLayoutCSS();
        const placeholder = document.getElementById("site-header");
        if (placeholder && !placeholder.querySelector('.topnav')) {
            placeholder.innerHTML = createHeaderHTML();
        }
    });
})();
