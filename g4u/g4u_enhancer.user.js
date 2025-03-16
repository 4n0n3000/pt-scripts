// ==UserScript==
// @name         G4U Enhancer
// @version      1.0.5
// @description  Removes promotional elements, nullifies openPopup function, and adds dark mode to g4u.to
// @author       BEY0NDER
// @match        *://g4u.to/*
// @match        *://*.g4u.to/*
// @grant        none
// @namespace    https://github.com/4n0n3000/pt-scripts
// @homepageURL  https://github.com/4n0n3000/pt-scripts
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/g4u/g4u_enhancer.user.js
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/g4u/g4u_enhancer.user.js
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Nullify the openPopup function
    window.addEventListener('load', function() {
        if (typeof window.openPopup !== 'undefined') {
            window.openPopup = function() {
                // Do nothing - function nullified
                console.log("openPopup function called but nullified");
                return false;
            };
        }
    });

    // Check if we're on a game page
    function isOnGamePage() {
        const regex = /^https:\/\/g4u\.to\/..\/\d+-.*/;
        return regex.test(window.location.href);
    }


    function usenetMode(isUsenetModeEnabled) {
        const nonUsenet = [
            'ddownload.com',
            'rapidgator.net',
            'katfile.com',
            'gofile.io',
            'vikingfile.com'
        ];

        nonUsenet.forEach(host => {
            document.querySelectorAll(`img[alt="${host}"]`).forEach(img => {
                const tableRow = img.closest('tr');
                if (tableRow) {
                    if (isUsenetModeEnabled) {
                        // Hide the row when Usenet mode is enabled
                        tableRow.style.display = 'none';
                    } else {
                        // Show the row when Default mode is enabled
                        tableRow.style.display = '';
                    }
                }
            });
        });
    }

    function addUsenetModeToggle() {
        // Only proceed if we're on the correct page
        if (!isOnGamePage()) {
            return;
        }

        // Create the Usenet Mode toggle button
        const usenet_toggleButton = document.createElement('button');
        usenet_toggleButton.textContent = '🧠 NZB Mode';
        usenet_toggleButton.className = 'usenet-mode-toggle w3-button w3-round w3-small';
        usenet_toggleButton.style.position = 'relative';
        usenet_toggleButton.style.opacity = '0.8';

        // Check if dark mode is already enabled from localStorage
        const isUsenetMode = localStorage.getItem('g4u-usenet-mode') === 'true';

        // Apply Usenet mode if it was previously enabled
        if (isUsenetMode) {
            document.body.classList.add('usenet-mode');
            usenetMode(isUsenetMode)
            usenet_toggleButton.textContent = '🧠 NZB Mode';
        } else {
            usenet_toggleButton.textContent = '💩 DDL + NZB Mode';
        }

        // Add click event to toggle dark mode
        usenet_toggleButton.addEventListener('click', function() {
            const isUsenetModeEnabled = document.body.classList.toggle('usenet-mode');
            usenetMode(isUsenetModeEnabled)
            localStorage.setItem('g4u-usenet-mode', isUsenetModeEnabled ? 'true' : 'false');
            // Update button text
            usenet_toggleButton.textContent = isUsenetModeEnabled ? '🧠 NZB Mode' : '💩 DDL + NZB Mode';
        });

        // Add the button to the page

        // Create a new table row
        const newRow = document.createElement('tr');

        // Create a table cell to contain the button
        const newCell = document.createElement('td');
        newCell.colSpan = 3; // Make the cell span across all columns
        newCell.style.textAlign = "center"; // Center the content

        // Add the button to the cell
        newCell.appendChild(usenet_toggleButton);

        // Add the cell to the row
        newRow.appendChild(newCell);

        // Find the tbody and add the new row at the end
        const tbody = document.querySelector('.w3-table-all > tbody');
        if (tbody) {
            // Append to the end of the tbody
            tbody.appendChild(newRow);
        } else {
            // Fallback if tbody not found
            document.body.appendChild(usenet_toggleButton);
        }

    }


    // Function to remove promotional elements
    function removePromotionalElements() {
        // Remove the "Would you like to support us?" paragraph
        document.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('Would you like to support us? Thanks!')) {
                // Find the parent element and remove it
                const parent = p.closest('.w3-panel.w3-black.w3-center.w3-small');
                if (parent) {
                    parent.remove();
                } else {
                    p.remove();
                }
            }
        });

        // Remove the orange ddownload.com banner
        document.querySelectorAll('a[href="/ddlto"]').forEach(a => {
            if (a.classList.contains('w3-block') && a.classList.contains('w3-orange')) {
                a.remove();
            }
        });

        // Remove the entire promotional panel if it exists
        document.querySelectorAll('.w3-panel.w3-black.w3-center.w3-small').forEach(panel => {
            const paragraphs = panel.querySelectorAll('p');
            for (let p of paragraphs) {
                if (p.textContent.includes('Would you like to support us? Thanks!')) {
                    panel.remove();
                    break;
                }
            }
        });

        // Remove the partner banner (hd-source.to)
        document.querySelectorAll('.w3-content.w3-black.w3-center.w3-padding.w3-margin-bottom').forEach(div => {
            const links = div.querySelectorAll('a[href*="hd-source.to"]');
            if (links.length > 0) {
                div.remove();
            }
        });

        // Alternative way to find the partner banner
        document.querySelectorAll('a[href*="hd-source.to"]').forEach(a => {
            const parentDiv = a.closest('.w3-content.w3-black.w3-center.w3-padding.w3-margin-bottom');
            if (parentDiv) {
                parentDiv.remove();
            }
        });

        // Look for the image as well
        document.querySelectorAll('img[src*="hd-source-partner-banner"]').forEach(img => {
            const parentDiv = img.closest('.w3-content.w3-black.w3-center.w3-padding.w3-margin-bottom');
            if (parentDiv) {
                parentDiv.remove();
            }
        });

        // Delete freediscussions.com (Usenet)
        document.querySelectorAll('img[alt="freediscussions.com"]').forEach(img => {
            const tableRow = img.closest('tr');
            if (tableRow) {
                tableRow.remove();
            }
        });

    }

    // Function to make the Notes section collapsible - run this only once
    function makeNotesCollapsible() {
        // Check if we've already processed the notes sections
        if (document.querySelector('.notes-processed')) {
            return;
        }

        document.querySelectorAll('div.w3-dark-grey.w3-padding').forEach(div => {
            if (div.textContent.includes('Notes') && !div.classList.contains('notes-processed')) {
                // Mark this div as processed to avoid duplicate processing
                div.classList.add('notes-processed');

                // Find the next element after the Notes header
                let contentDiv = div.nextElementSibling;

                if (contentDiv) {
                    // Create a wrapper div for the content if it doesn't exist
                    const wrapperDiv = document.createElement('div');
                    wrapperDiv.className = 'notes-content';
                    wrapperDiv.style.display = 'none'; // Hidden by default

                    // Insert the wrapper before the content
                    div.parentNode.insertBefore(wrapperDiv, contentDiv);

                    // Move the content into the wrapper
                    wrapperDiv.appendChild(contentDiv);

                    // Make the header clickable
                    div.style.cursor = 'pointer';
                    div.style.setProperty('background-color', 'rgb(45, 45, 45)', 'important');
                    div.style.fontWeight = 'bold';
                    div.title = 'Click to expand/collapse';

                    // Add a visual indicator if it doesn't exist
                    if (!div.querySelector('.collapse-indicator')) {
                        const indicator = document.createElement('span');
                        indicator.textContent = ' [+]';
                        indicator.style.float = 'right';
                        indicator.className = 'collapse-indicator';
                        div.appendChild(indicator);
                    }

                    // Add click event
                    div.addEventListener('click', function() {
                        const indicator = div.querySelector('.collapse-indicator');
                        if (wrapperDiv.style.display === 'none') {
                            wrapperDiv.style.display = 'block';
                            if (indicator) indicator.textContent = ' [-]';
                        } else {
                            wrapperDiv.style.display = 'none';
                            if (indicator) indicator.textContent = ' [+]';
                        }
                    });
                }
            }
        });
    }

    // Function to add dark mode toggle button
    function addDarkModeToggle() {
        // Create the dark mode toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '🌙 Dark Mode';
        toggleButton.className = 'dark-mode-toggle w3-button w3-round w3-small';
        toggleButton.style.position = 'fixed';
        toggleButton.style.bottom = '60px';
        toggleButton.style.right = '20px';
        toggleButton.style.zIndex = '1000';
        toggleButton.style.padding = '8px 16px';
        toggleButton.style.opacity = '0.8';
        toggleButton.style.color = "#a2a2a2";

        // Check if dark mode is already enabled from localStorage
        const isDarkMode = localStorage.getItem('g4u-dark-mode') === 'true';

        // Apply dark mode if it was previously enabled
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            toggleButton.textContent = '☀️ Light Mode';
        }

        // Add click event to toggle dark mode
        toggleButton.addEventListener('click', function() {
            const isDarkModeEnabled = document.body.classList.toggle('dark-mode');
            localStorage.setItem('g4u-dark-mode', isDarkModeEnabled ? 'true' : 'false');

            // Update button text
            toggleButton.textContent = isDarkModeEnabled ? '☀️ Light Mode' : '🌙 Dark Mode';
        });

        // Add the button to the page
        document.body.appendChild(toggleButton);
    }

    // Function to add dark mode CSS
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

        // Create a style element and append the CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = darkModeCSS;
        document.head.appendChild(styleElement);
    }

    // Run our functions when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            removePromotionalElements();
            // Run the notes collapsible function only once when the DOM is fully loaded
            setTimeout(makeNotesCollapsible, 500);
            // Add dark mode functionality
            addDarkModeCSS();
            addDarkModeToggle();
            addUsenetModeToggle();
        });
    } else {
        removePromotionalElements();
        // Run the notes collapsible function only once when the DOM is fully loaded
        setTimeout(makeNotesCollapsible, 500);
        // Add dark mode functionality
        addDarkModeCSS();
        addDarkModeToggle();
        addUsenetModeToggle();
    }

    // Create a MutationObserver to handle dynamically added elements
    const observer = new MutationObserver(function() {
        removePromotionalElements();
        // We don't call makeNotesCollapsible here to avoid the loop
    });

    // Start observing the document body for changes
    window.addEventListener('load', function() {
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
