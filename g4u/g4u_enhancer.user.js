// ==UserScript==
// @name         G4U Enhancer
// @version      1.1.0
// @description  Removes promotional elements, nullifies openPopup function, and adds dark mode to g4u.to
// @author       BEY0NDER
// @match        *://g4u.to/*
// @match        *://*.g4u.to/*
// @grant        none
// @icon         https://g4u.to/favicon.ico
// @namespace    https://github.com/4n0n3000/pt-scripts
// @homepageURL  https://github.com/4n0n3000/pt-scripts
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/g4u/g4u_enhancer.user.js
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/g4u/g4u_enhancer.user.js
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // Constants
    // ========================================
    const STORAGE_KEYS = {
        DARK_MODE: 'g4u-dark-mode',
        USENET_MODE: 'g4u-usenet-mode'
    };

    const GAME_PAGE_REGEX = /^https:\/\/g4u\.to\/\w+\/\d+-.*/;

    const NON_USENET_HOSTS = [
        'ddownload.com',
        'rapidgator.net',
        'katfile.com',
        'gofile.io',
        'vikingfile.com',
        'katfile.cloud'
    ];

    const PROMOTIONAL_SELECTORS = {
        supportParagraph: 'Would you like to support us? Thanks!',
        wannaSupportParagraph: 'Wanna support us?',
        ddownloadBanner: 'At ddownload.com you can get an annual account',
        vpnAdvertisement: 'Use a VPN to unlock the streaming & downloading - Signup Now!',
        freeHighspeedDownload: '⚡ Free Highspeed Download',
        highspeedDownload: '⚡ Highspeed Download',
        FreeHostsAndNZBsNotice: 'Since free hosts and NZBs don’t generate support for us, we finance services like'
    };

    const TIMEOUTS = {
        NOTES_COLLAPSIBLE: 500
    };

    const BUTTON_CONFIG = {
        darkMode: {
            position: 'fixed',
            bottom: '60px',
            right: '20px',
            zIndex: '1000',
            padding: '8px 16px',
            opacity: '0.8',
            color: '#a2a2a2'
        },
        usenetMode: {
            position: 'relative',
            opacity: '0.8'
        }
    };

    const BUTTON_TEXT = {
        darkMode: {
            enabled: '☀️ Light Mode',
            disabled: '🌙 Dark Mode'
        },
        usenetMode: {
            enabled: '🧠 NZB Mode',
            disabled: '💩 DDL + NZB Mode'
        }
    };

    // ========================================
    // Utility Functions
    // ========================================

    /**
     * Checks if the current page is a game page
     */
    function isOnGamePage() {
        return GAME_PAGE_REGEX.test(window.location.href);
    }

    /**
     * Gets a boolean value from localStorage
     */
    function getStorageBoolean(key) {
        return localStorage.getItem(key) === 'true';
    }

    /**
     * Sets a boolean value in localStorage
     */
    function setStorageBoolean(key, value) {
        localStorage.setItem(key, value ? 'true' : 'false');
    }

    /**
     * Removes elements matching a selector
     */
    function removeElements(selector, callback = null) {
        document.querySelectorAll(selector).forEach(element => {
            if (callback) {
                callback(element);
            } else {
                element.remove();
            }
        });
    }

    /**
     * Removes elements containing specific text
     */
    function removeElementsByText(selector, textContent, parentSelector = null) {
        document.querySelectorAll(selector).forEach(element => {
            if (element.textContent.includes(textContent)) {
                if (parentSelector) {
                    const parent = element.closest(parentSelector);
                    if (parent) {
                        parent.remove();
                        return;
                    }
                }
                element.remove();
            }
        });
    }

    // ========================================
    // Popup Blocker
    // ========================================

    /**
     * Nullifies the openPopup function to prevent popups
     */
    function nullifyPopupFunction() {
        if (typeof window.openPopup !== 'undefined') {
            window.openPopup = function() {
                console.log('openPopup function called but nullified');
                return false;
            };
        }
    }

    // ========================================
    // Usenet Mode
    // ========================================

    /**
     * Toggles visibility of non-Usenet download hosts
     */
    function toggleNonUsenetHosts(isUsenetModeEnabled) {
        NON_USENET_HOSTS.forEach(host => {
            removeElements(`img[alt="${host}"]`, (img) => {
                const tableRow = img.closest('div');
                if (tableRow) {
                    tableRow.style.display = isUsenetModeEnabled ? 'none' : '';
                }
            });
        });
    }

    /**
     * Creates and configures the Usenet mode toggle button
     */
    function createUsenetToggleButton() {
        const button = document.createElement('button');
        button.className = 'usenet-mode-toggle w3-button w3-round w3-small';
        Object.assign(button.style, BUTTON_CONFIG.usenetMode);

        const isUsenetMode = getStorageBoolean(STORAGE_KEYS.USENET_MODE);

        if (isUsenetMode) {
            document.body.classList.add('usenet-mode');
            toggleNonUsenetHosts(true);
        }

        button.textContent = isUsenetMode ? BUTTON_TEXT.usenetMode.enabled : BUTTON_TEXT.usenetMode.disabled;

        button.addEventListener('click', function() {
            const isEnabled = document.body.classList.toggle('usenet-mode');
            toggleNonUsenetHosts(isEnabled);
            setStorageBoolean(STORAGE_KEYS.USENET_MODE, isEnabled);
            button.textContent = isEnabled ? BUTTON_TEXT.usenetMode.enabled : BUTTON_TEXT.usenetMode.disabled;
        });

        return button;
    }

    /**
     * Adds the Usenet mode toggle button to the page
     */
    function addUsenetModeToggle() {
        if (!isOnGamePage()) {
            return;
        }

        const button = createUsenetToggleButton();
        const newRow = document.createElement('tr');
        const newCell = document.createElement('td');

        newCell.colSpan = 3;
        newCell.style.textAlign = 'center';
        newCell.appendChild(button);
        newRow.appendChild(newCell);

        const tbody = document.querySelector('.w3-table-all > tbody');
        if (tbody) {
            tbody.appendChild(newRow);
        } else {
            document.body.appendChild(button);
        }
    }



    // ========================================
    // Promotional Content Removal
    // ========================================

    /**
     * Removes promotional elements from the page
     */
    function removePromotionalElements() {
        removeElementsByText('p', PROMOTIONAL_SELECTORS.supportParagraph, '.w3-panel.w3-black.w3-center.w3-small');
        removeElementsByText('p', PROMOTIONAL_SELECTORS.wannaSupportParagraph, '.w3-panel.w3-black.w3-center.w3-small');
        removeElementsByText('p', PROMOTIONAL_SELECTORS.ddownloadBanner, '.w3-panel.w3-black.w3-center.w3-small');
        removeElementsByText('a', PROMOTIONAL_SELECTORS.vpnAdvertisement, 'a.w3-block');
        removeElementsByText('a', PROMOTIONAL_SELECTORS.freeHighspeedDownload, 'div');
        removeElementsByText('a', PROMOTIONAL_SELECTORS.highspeedDownload, 'div');
        removeElementsByText('p', PROMOTIONAL_SELECTORS.FreeHostsAndNZBsNotice, 'div');

        removeElements('a[href="/ddlto"]', (element) => {
            if (element.classList.contains('w3-block') && element.classList.contains('w3-orange')) {
                element.remove();
            }
        });

        removeElements('a[href*="hd-source.to"]', (element) => {
            const parentDiv = element.closest('.w3-content.w3-black.w3-center.w3-padding.w3-margin-bottom');
            if (parentDiv) {
                parentDiv.remove();
            }
        });

        removeElements('img[src*="hd-source-partner-banner"]', (element) => {
            const parentDiv = element.closest('.w3-content.w3-black.w3-center.w3-padding.w3-margin-bottom');
            if (parentDiv) {
                parentDiv.remove();
            }
        });

        removeElements('img[alt="freediscussions.com"]', (element) => {
            const tableRow = element.closest('tr');
            if (tableRow) {
                tableRow.remove();
            }
        });
    }

    // ========================================
    // Notes Section
    // ========================================

    /**
     * Makes the Notes section collapsible
     */
    function makeNotesCollapsible() {
        if (document.querySelector('.notes-processed')) {
            return;
        }

        document.querySelectorAll('div.w3-dark-grey.w3-padding').forEach(div => {
            if (!div.textContent.includes('Notes') || div.classList.contains('notes-processed')) {
                return;
            }

            div.classList.add('notes-processed');
            const contentDiv = div.nextElementSibling;

            if (!contentDiv) {
                return;
            }

            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'notes-content';
            wrapperDiv.style.display = 'none';

            div.parentNode.insertBefore(wrapperDiv, contentDiv);
            wrapperDiv.appendChild(contentDiv);

            div.style.cursor = 'pointer';
            div.style.setProperty('background-color', 'rgb(45, 45, 45)', 'important');
            div.style.fontWeight = 'bold';
            div.title = 'Click to expand/collapse';

            if (!div.querySelector('.collapse-indicator')) {
                const indicator = document.createElement('span');
                indicator.textContent = ' [+]';
                indicator.style.float = 'right';
                indicator.className = 'collapse-indicator';
                div.appendChild(indicator);
            }

            div.addEventListener('click', function() {
                const indicator = div.querySelector('.collapse-indicator');
                const isHidden = wrapperDiv.style.display === 'none';
                wrapperDiv.style.display = isHidden ? 'block' : 'none';
                if (indicator) {
                    indicator.textContent = isHidden ? ' [-]' : ' [+]';
                }
            });
        });
    }

    // ========================================
    // Dark Mode
    // ========================================

    /**
     * Adds the dark mode toggle button to the page
     */
    function addDarkModeToggle() {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'dark-mode-toggle w3-button w3-round w3-small';
        Object.assign(toggleButton.style, BUTTON_CONFIG.darkMode);

        const isDarkMode = getStorageBoolean(STORAGE_KEYS.DARK_MODE);

        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }

        toggleButton.textContent = isDarkMode ? BUTTON_TEXT.darkMode.enabled : BUTTON_TEXT.darkMode.disabled;

        toggleButton.addEventListener('click', function() {
            const isEnabled = document.body.classList.toggle('dark-mode');
            setStorageBoolean(STORAGE_KEYS.DARK_MODE, isEnabled);
            toggleButton.textContent = isEnabled ? BUTTON_TEXT.darkMode.enabled : BUTTON_TEXT.darkMode.disabled;
        });

        document.body.appendChild(toggleButton);
    }

    /**
     * Adds dark mode CSS styles to the page
     */
    function addDarkModeCSS() {
        const darkModeCSS = `
        /* Dark Mode Styles */
        body.dark-mode {
            background-color: #121212;
            color: #e0e0e0;
        }

        /* Dark mode overrides for W3.CSS */
        body.dark-mode .w3-white {
            background-color: #1e1e1e !important;
            color: #e0e0e0 !important;
        }

        body.dark-mode .w3-light-grey,
        body.dark-mode .w3-light-gray,
        body.dark-mode .w3-hover-light-grey:hover,
        body.dark-mode .w3-hover-light-gray:hover {
            background-color: #2d2d2d !important;
            color: #e0e0e0 !important;
        }

        body.dark-mode .w3-container,
        body.dark-mode .w3-panel {
            background-color: #1e1e1e;
            color: #e0e0e0;
        }

        body.dark-mode .usenet-mode-toggle {
            #e0e0e0;
        }
        body.dark-mode .w3-card,
        body.dark-mode .w3-card-2,
        body.dark-mode .w3-card-4 {
            background-color: #2d2d2d;
            color: #e0e0e0;
            box-shadow: 0 2px 5px 0 rgba(0,0,0,0.5),0 2px 10px 0 rgba(0,0,0,0.5);
        }

        body.dark-mode .w3-input,
        body.dark-mode .w3-select {
            background-color: #2d2d2d;
            color: #e0e0e0;
            border-bottom: 1px solid #555;
        }

        body.dark-mode .w3-button:hover {
            color: #e0e0e0 !important;
            background-color: #444 !important;
        }

        body.dark-mode .w3-table,
        body.dark-mode .w3-table-all {
            background-color: #2d2d2d;
            color: #e0e0e0;
        }

        body.dark-mode .w3-striped tbody tr:nth-child(even) {
            background-color: #333;
        }

        body.dark-mode .w3-striped tbody tr:nth-child(even) {
            background-color: #333;
        }

        body.dark-mode .w3-bordered tr,
        body.dark-mode .w3-table-all tr {
            border-bottom: 1px solid #444;
        }

        body.dark-mode .w3-code {
            background-color: #2d2d2d;
            color: #e0e0e0;
            border-left: 4px solid #4CAF50;
        }

        body.dark-mode .w3-codespan {
            color: #ff6b6b;
            background-color: #2d2d2d;
        }

        /* Dark mode for specific elements */
        body.dark-mode .w3-dark-grey,
        body.dark-mode .w3-dark-gray {
            background-color: #444 !important;
            color: #e0e0e0 !important;
        }

        body.dark-mode .dark-mode-toggle {
            background-color: #333;
            color: #e0e0e0;
            border: 1px solid #555;
        }

        /* Hover effects for dark mode */
        body.dark-mode .w3-hoverable tbody tr:hover,
        body.dark-mode .w3-ul.w3-hoverable li:hover {
            background-color: #444;
        }

        /* Border colors for dark mode */
        body.dark-mode .w3-border,
        body.dark-mode .w3-border-top,
        body.dark-mode .w3-border-bottom,
        body.dark-mode .w3-border-left,
        body.dark-mode .w3-border-right {
            border-color: #555 !important;
        }

        body.dark-mode .w3-text-black, .w3-hover-text-black:hover {
            color: #e8e8e8 !important;
        }

        body.dark-mode .w3-table-all tr:nth-child(2n+1) {
            background-color: #1e1e1e;
        }

        body.dark-mode .w3-table-all tr:nth-child(2n) {
            background-color: #333;
        }

        body.dark-mode .w3-table-all {
            border: 0px;
        }

        body.dark-mode .w3-grey, .w3-hover-grey:hover, .w3-gray, .w3-hover-gray:hover {
            color: #fff !important;
            background-color: #2d2d2d00 !important;
        }

        body.dark-mode .mgame {
            background-color: #333 !important;
            color: #e0e0e0 !important;
        }

        body.dark-mode .mgame[style*="background-color: #f1f1f1"] {
            background-color: #2a2a2a !important;
        }

        body.dark-mode .mgame[style*="background-color: #ffffff"] {
            background-color: #333 !important;
        }

        body.dark-mode .w3-opacity {
            color: #bbb !important;
        }

        body.dark-mode .w3-hover-blue:hover {
            background-color: #1a3c5e !important;
        }

        body.dark-mode .w3-dark-grey {
            background-color: #444 !important;
        }

        body.dark-mode p {
            color: #e0e0e0 !important;
        }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = darkModeCSS;
        document.head.appendChild(styleElement);
    }

    // ========================================
    // Initialization
    // ========================================

    /**
     * Initializes all enhancements
     */
    function initialize() {
        removePromotionalElements();
        setTimeout(makeNotesCollapsible, TIMEOUTS.NOTES_COLLAPSIBLE);
        addDarkModeCSS();
        addDarkModeToggle();
        addUsenetModeToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    window.addEventListener('load', function() {
        nullifyPopupFunction();

        const observer = new MutationObserver(removePromotionalElements);
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
