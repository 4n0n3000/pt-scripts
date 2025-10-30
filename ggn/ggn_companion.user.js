// ==UserScript==
// @name        GGn Companion
// @namespace    https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_companion.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_companion.user.js
// @match       https://gazellegames.net/*
// @grant       none
// @version     1.1.0
// @author      BEY0NDER
// @description Makes the site darker and changes the way NFO Images are rendered
// @icon	     https://gazellegames.net/favicon.ico
// ==/UserScript==

function GGn_companion() {

    // NFO Image Adjustments
    const nfoImg = document.querySelectorAll('img').forEach((img) => {
        if (img.src.includes('/nfoimg/')) {
            img.style.filter = 'invert(100%)';
            img.style.mixBlendMode = 'screen';
        }
    });

    const css = `
:root {
    --darkBlue:rgb(8, 22, 42);
    --darkBlue80: rgba(8, 22, 42, .80);
    --darkBlue50: rgba(8, 22, 42, .50);
    --darkBlue2: rgb(6, 17, 32);
    --mediumBlue:rgb(24, 45, 72);
    --mediumBlue90: rgba(24, 45, 72, .90);
    --mediumBlue50: rgba(24, 45, 72, .50);
    --lightBlue: #C6E6F6;
    --lightBlue30: rgba(198, 230, 246, .30);
    --darkGreen: #69C077;
    --darkGreen60: rgba(105, 192, 119, .60);
    --lightGreen: #D9E473;
    --pink: #EDC2DB;
    --darkPink: #C92020;
    --darkRed: #BF6A6A;
    --red: #DD3434;
    --upVote: #86D406;
    --downVote: #CC0000;
    --noVote: #B5b4C2;
    --stickyBkg: #225387;
    --label: rgba(198, 230, 246, .30);
    --rowa: rgba(27, 47, 63, .85);
    --rowb: rgba(24, 59, 88, .85);
    --rowA60: rgba(27, 47, 63, .60);
    --rowB60: rgba(24, 59, 88, .60);
    --rowAHover: rgba(43, 78, 102, .80);
    --rowBHover: rgba(43, 78, 102, .80);
    --white: #FFF;
    --grey: #B5B4C2;
    --black: #000;
}

body {
	background-color: #151515 !important;
	background-blend-mode: soft-light;
}

.box, table, .profile .box_main_info {
    background: none !important;
}

.colhead, .colhead_dark, .head {
	margin: 0px 10px 10px -10px !important;
	background: #213c62;
	box-shadow: unset;
	border-radius: unset;
	width: 100%;
}

#gallery_view {
	background: #182d48;
	border-radius: 5px;
}

.groupWrapper {
	background: #182d48;
    border-radius: 5px;
}

.releaseTitle, .releaseFooter {
	background: #182d48;
}
    `;
    
    const style = document.createElement('style');
    document.head.appendChild(style);
    
    // State management for CSS toggle
    let cssInjected = true;
    style.textContent = css; // Inject CSS by default
    
    // Create floating toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'ggn-theme-toggle';
    toggleButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #C6E6F6;
        background: #182d48;
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
    `;
    
    // Moon icon (for dark mode - when CSS is injected)
    const moonIcon = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C6E6F6" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    `;
    
    // Sun icon (for light mode - when CSS is not injected)
    const sunIcon = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C6E6F6" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    `;
    
    // Set initial icon (moon since CSS is injected)
    toggleButton.innerHTML = moonIcon;
    
    // Add hover effect
    toggleButton.addEventListener('mouseenter', () => {
        toggleButton.style.transform = 'scale(1.1)';
        toggleButton.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
    });
    
    toggleButton.addEventListener('mouseleave', () => {
        toggleButton.style.transform = 'scale(1)';
        toggleButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
    });
    
    // Toggle functionality
    toggleButton.addEventListener('click', () => {
        cssInjected = !cssInjected;
        
        if (cssInjected) {
            style.textContent = css;
            toggleButton.innerHTML = moonIcon;
        } else {
            style.textContent = '';
            toggleButton.innerHTML = sunIcon;
        }
    });
    
    // Append button to body
    document.body.appendChild(toggleButton);

    function typeFilter() {
        const group_torrent = document.querySelectorAll('.group_torrent');
        group_torrent.forEach(torrent => {
            const torrentIdRegex = /torrent\d+/;
            if (!torrentIdRegex.test(torrent.id)) {
                torrent.id = 'group_header';
                return;
            }
            const sceneRegex = /(\[|,\s)(Scene)/;
            if (sceneRegex.test(torrent.innerText)) {
                torrent.classList.add('scene');
            } else {
                torrent.classList.add('p2p');
            }

            const drmFreeRegex = /(\[|,\s)(DRM Free|GOG)/;
            if (drmFreeRegex.test(torrent.innerText)) {
                torrent.classList.add('drm_free');
            }
            
        });
    }
    typeFilter();

    const torrentDetails = document.querySelector('.torrent_details');
    const dropdown = document.createElement('select');
    dropdown.innerHTML = `
        <option value="all">All</option>
        <option value="scene">Scene</option>
        <option value="p2p">P2P</option>
        <option value="drm_free">DRM Free</option>
    `;
    
    dropdown.style.display = 'block';
    dropdown.style.position = 'absolute';
    dropdown.style.right = '10px';
    dropdown.style.top = '54px';
    
    torrentDetails.insertBefore(dropdown, torrentDetails.querySelector('.groupoptions'));

    dropdown.addEventListener('change', (event) => {
        filterTorrents(event.target.selectedOptions);
    });

    function filterTorrents(selectedOptions) {
        const group_torrent = document.querySelectorAll('.group_torrent');
        const selectedValue = selectedOptions[0].value;
        const torrentIdRegex = /torrent\d+/;
        
        group_torrent.forEach(torrent => {
            if (!torrentIdRegex.test(torrent.id)) {
                return;
            }
            
            if (selectedValue === 'all') {
                torrent.style.display = '';
            } else if (torrent.classList.contains(selectedValue)) {
                torrent.style.display = '';
            } else {
                torrent.style.display = 'none';
            }
        });
        
        // Hide group_header elements where the next sibling is hidden
        // Hide tbody elements where all children are hidden
        const tbodies = new Set();
        group_torrent.forEach(torrent => {
            if (torrent.parentElement) {
                tbodies.add(torrent.parentElement);
            }
        });
        
        tbodies.forEach(tbody => {
            const editionRegex = /edition_\d+/;
            if (editionRegex.test(tbody.id)) {
                const rows = tbody.querySelectorAll('tr');
                const allHidden = Array.from(rows).every(row => 
                    row.style.display === 'none' || row.classList.contains('hidden')
                );
                if (allHidden && rows.length > 0) {
                    tbody.previousElementSibling.style.display = 'none';
                } else {
                    tbody.previousElementSibling.style.display = '';
                }
            }
        });
    }
}
GGn_companion();