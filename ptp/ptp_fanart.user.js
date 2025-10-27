// ==UserScript==
// @name         PTP Fanart Background & Logo
// @version      1.1.12
// @description  Replaces PTP background and logo with Fanart artwork and applies blur + dark overlay for movies
// @author       BEY0NDER
// @namespace    https://github.com/4n0n3000/pt-scripts
// @homepageURL  https://passthepopcorn.me/forums.php?action=viewthread&threadid=45302
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ptp/ptp_fanart.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ptp/ptp_fanart.user.js
// @match        *://passthepopcorn.me/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @connect      webservice.fanart.tv
// @connect      assets.fanart.tv
// @icon         https://passthepopcorn.me/favicon.ico
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let saved;

    // Initialize GM_config for settings
    GM_config.init({
        'id': 'PTP_Fanart_Config',
        'title': `
            <div>
                <div style="user-select: none; font-family: 'Bebas Neue', Helvetica, Tahoma, Geneva, sans-serif; background-color: #4281da; background-image: linear-gradient( 90deg, #e66534 4%, #e69734 19%, #e2d956 39%, #62e080 60%, #d195cb 80%, #e646dd 100% ); -webkit-background-clip: text; -webkit-text-fill-color: transparent; -webkit-filter: brightness(110%); filter: brightness(110%); text-shadow: 0 0 15px rgba(230, 101, 52, 0.55); transition: all 0.3s; font-weight: bold; padding-top: 3%;">
                    PTP Fanart Settings<br>
                </div>
                <div style="margin-top:15px"><small style="font-weight: 300; color: #95a5a6; display: block; font-size: 0.6rem; margin-top: 5px;"><i>Hover over settings marked with * to see more information</i></small></div>
            </div>
        `,
        'fields': {
            'FANART_API_KEY': {
                'label': 'Fanart.tv API Key *',
                'type': 'text',
                'default': 'ABCD1234',
                'title': 'Your Fanart.tv API key - You\'ll need to sign up at https://fanart.tv/get-an-api-key/'
            },
            'replaceSiteLogo': {
                'label': 'Replace Site Logo',
                'type': 'checkbox',
                'default': true,
                'title': 'Set to false if you don\'t want to replace the site logo'
            },
            'languageISO': {
                'label': 'Logo Language *',
                'type': 'text',
                'default': 'en',
                'title': 'Logo language ISO code (e.g., en, fr, es, etc)'
            },
            'cacheExpiryDays': {
                'label': 'Cache Expiry (days)',
                'type': 'int',
                'default': 7,
                'title': 'Number of days to cache artwork data'
            },
            'hideUntilLoaded': {
                'label': 'Hide Until Loaded',
                'type': 'checkbox',
                'default': true,
                'title': 'Hide the page until artwork is loaded'
            },
            'maxBackgroundImages': {
                'label': 'Max Background Images',
                'type': 'int',
                'default': 4,
                'title': 'Maximum number of background images to select from'
            },
            'blurAmount': {
                'label': 'Background Blur Amount *',
                'type': 'int',
                'default': 5,
                'title': 'Amount of blur applied to background (0-20)'
            },
            'darkOverlayOpacity': {
                'label': 'Dark Overlay Opacity *',
                'type': 'float',
                'default': 0.5,
                'title': 'Opacity of dark overlay on background (0-1)'
            },
            'enableDebug': {
                'label': 'Enable Debug Mode',
                'type': 'checkbox',
                'default': false,
                'title': 'Enable console logging for debugging'
            },
            'theme': {
                'label': 'Theme',
                'type': 'select',
                'options': ['Default', 'Audionut'],
                'default': 'Default',
                'title': 'Select visual theme to apply'
            }
        },
        "events": {
            "open": function (doc) {
                let style = this.frame.style;
                style.width = "420px";
                style.height = "670px";
                style.inset = "";
                style.top = "2%";
                style.right = "6%";
                style.borderRadius = "5px";
                style.boxShadow = "0px 4px 12px rgba(0, 0, 0, 0.1)";

                saved = false;

                // Create version element
                const versionEl = document.createElement('a');
                versionEl.classList = 'version_label reset';
                versionEl.textContent = `version ${GM.info.script.version}`;
                versionEl.title = 'Go to homepage';
                versionEl.target = '_blank';
                versionEl.href = 'https://passthepopcorn.me/forums.php?action=viewthread&threadid=45302';
                doc.getElementById('PTP_Fanart_Config_buttons_holder').appendChild(versionEl);

                // Add success animation to save button
                const saveButton = doc.getElementById('PTP_Fanart_Config_saveBtn');
                saveButton.addEventListener('click', () => {
                    saveButton.classList.add('success');
                    setTimeout(() => saveButton.classList.remove('success'), 500);
                });

                // Group checkboxes with visual styling
                const checkboxSections = [
                    'replaceSiteLogo',
                    'hideUntilLoaded',
                    'enableDebug'
                ];

                checkboxSections.forEach(field => {
                    const checkboxVar = doc.getElementById(`PTP_Fanart_Config_${field}_var`);
                    if (checkboxVar) {
                        checkboxVar.classList.add('checkbox-section');
                    }
                });

                // Group slider controls with visual styling
                const sliderSections = [
                    'blurAmount',
                    'darkOverlayOpacity'
                ];

                sliderSections.forEach(field => {
                    const sliderVar = doc.getElementById(`PTP_Fanart_Config_${field}_var`);
                    if (sliderVar) {
                        sliderVar.classList.add('slider-section');
                    }
                });
            },
            "save": function () {
                saved = true;
                // Clear cached data when settings are saved
                GM_listValues().forEach(key => {
                    if (key !== 'PTP_Fanart_Config') {
                        GM_setValue(key, null);
                    }
                });
                console.log('PTP Fanart: Cleared cache data after settings change');
            },
            "reset": function () {
                // Handle reset functionality
                if (typeof resetToDefaults === 'function') {
                    resetToDefaults();
                }
            },
            "close": function () {
                if (saved) {
                    if (this.frame) {
                        window.location.reload();
                    } else {
                        setTimeout(() => {
                            window.location.reload();
                        }, 250);
                    }
                }
            }
        },
        'css': `
            #PTP_Fanart_Config {
                background: #191d2a;
                margin: 0;
                padding: 10px 20px;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #PTP_Fanart_Config .config_header {
                color: #fff;
                padding-bottom: 10px;
                font-weight: 100;
                justify-content: center;
                align-items: center;
                text-align: center;
                border-bottom: none;
                background: transparent;
                margin: 0;
            }
            #PTP_Fanart_Config .config_var {
                display: flex;
                flex-direction: row;
                text-align: left;
                justify-content: space-between;
                align-items: center;
                width: 90%;
                margin-left: 26px;
                padding: 4px 0;
                border-bottom: 1px solid #7470703d;
                margin-top: 5px;
                margin-bottom: 5px;
            }
            #PTP_Fanart_Config .field_label {
                color: #fff;
                width: 45%;
                user-select: none;
                font-weight: 500;
            }
            #PTP_Fanart_Config .field_label.disabled {
                color: #B0BEC5;
            }
            #PTP_Fanart_Config input[type="text"],
            #PTP_Fanart_Config input[type="number"],
            #PTP_Fanart_Config select {
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #ddd;
                border-radius: 3px;
                box-sizing: border-box;
                font-size: 0.9em;
                padding: 8px;
                width: 55%;
                transition: all 0.3s ease;
            }
            #PTP_Fanart_Config input[type="text"]:focus,
            #PTP_Fanart_Config input[type="number"]:focus,
            #PTP_Fanart_Config select:focus {
                border-color: #2C3E50;
                box-shadow: 0 0 5px rgba(255, 128, 0, 0.5);
                outline: none;
            }
            #PTP_Fanart_Config input[type="checkbox"] {
                cursor: pointer;
                margin-right: 4px !important;
                width: 16px;
                height: 16px;
            }
            #PTP_Fanart_Config .reset {
                color: #95a5a6;
                text-decoration: none;
                user-select: none;
            }
            #PTP_Fanart_Config_buttons_holder {
                display: grid;
                column-gap: 20px;
                row-gap: 16px;
                grid-template-columns: 1fr 1fr 1fr;
                grid-template-rows: 1fr 1fr 1fr;
                width: 90%;
                margin-left: 26px;
                height: 94px;
                text-align: center;
                align-items: center;
                margin-top: 20px;
            }
            #PTP_Fanart_Config .reset_holder {
                grid-column: 3;
                grid-row: 2;
            }
            #PTP_Fanart_Config .version_label {
                grid-column: 1;
                grid-row: 2;
                text-align: left !important;
            }
            #PTP_Fanart_Config_resetLink {
                text-transform: lowercase;
                background: transparent;
                color: #95a5a6;
            }
            #PTP_Fanart_Config .version_label:hover,
            #PTP_Fanart_Config_resetLink:hover {
                text-decoration: underline;
            }
            #PTP_Fanart_Config .saveclose_buttons {
                margin: 22px 0px 4px;
            }
            #PTP_Fanart_Config_saveBtn {
                grid-column: 2;
                grid-row: 1;
                background-color: #2C3E50;
                color: #FFFFFF;
                border: none;
                border-radius: 5px;
                padding: 15px 20px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                will-change: background-color, transform;
                transition: background-color 0.2s ease, transform 0.2s ease;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                padding-top: 6px !important;
                padding-bottom: 6px !important;
            }
            #PTP_Fanart_Config_saveBtn:hover {
                background-color: #34495E;
                transform: translateY(-2px);
            }
            #PTP_Fanart_Config_saveBtn:active {
                background-color: #fd9b3a;
                transform: translateY(1px);
            }
            #PTP_Fanart_Config_saveBtn.success {
                box-shadow: 0 0 6px 3px rgba(253, 155, 58, 0.6);
            }
            #PTP_Fanart_Config_closeBtn {
                grid-column: 3;
                grid-row: 1;
                background-color: #2C3E50;
                color: #FFFFFF;
                border: none;
                border-radius: 5px;
                padding: 15px 20px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                will-change: background-color, transform;
                transition: background-color 0.2s ease, transform 0.2s ease;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                padding-top: 6px !important;
                padding-bottom: 6px !important;
            }
            #PTP_Fanart_Config_closeBtn:hover {
                background-color: #34495E;
                transform: translateY(-2px);
            }
            #PTP_Fanart_Config_closeBtn:active {
                background-color: #2C3E50;
                transform: translateY(1px);
            }
            /* Tooltip styling */
            #PTP_Fanart_Config .field_label[title]:hover::after {
                content: attr(title);
                position: absolute;
                background: #2C3E50;
                color: white;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 0.8em;
                max-width: 300px;
                z-index: 100;
                margin-top: 25px;
                left: 20px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }
            /* Animations */
            @keyframes pulse {
                0%, 100% {box-shadow: 0 0 6px 2px rgba(255, 128, 0, 0.5);}
                50% {box-shadow: 0 0 10px 4px rgba(255, 128, 0, 0.8);}
            }
        `
    });

    // Register the menu command to open settings
    GM_registerMenuCommand('PTP Fanart Settings', () => {
        GM_config.open();
    });

    // Get settings values with fallbacks to default values
    const FANART_API_KEY = GM_config.get('FANART_API_KEY') || 'ABCD1234';

    // Configuration options
    const CONFIG = {
        replaceSiteLogo: GM_config.get('replaceSiteLogo') !== undefined ? GM_config.get('replaceSiteLogo') : true,
        languageISO: GM_config.get('languageISO') || 'en',
        cacheExpiry: (GM_config.get('cacheExpiryDays') || 7) * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        hideUntilLoaded: GM_config.get('hideUntilLoaded') !== undefined ? GM_config.get('hideUntilLoaded') : true,
        maxBackgroundImages: GM_config.get('maxBackgroundImages') || 4,
        blurAmount: GM_config.get('blurAmount') !== undefined && GM_config.get('blurAmount') !== '' ? GM_config.get('blurAmount') : 5,
        darkOverlayOpacity: GM_config.get('darkOverlayOpacity') || 0.5,
        enableDebug: GM_config.get('enableDebug') !== undefined ? GM_config.get('enableDebug') : false,
        theme: GM_config.get('theme') || 'Default'
    };

    // Debug logging function
    const log = (...args) => {
        if (CONFIG.enableDebug) {
            console.log('[PTP Fanart]', ...args);
        }
    };

    // Log settings if debug is enabled
    log('Script initialized with settings:', {
        FANART_API_KEY: FANART_API_KEY ? '✓ Set' : '✗ Not set',
        CONFIG
    });

    // Default CSS
    const defaultCSS = `
        .forum-post {
            background-color: #2f354669;
            backdrop-filter: brightness(0.8);
        }

        .group_torrent.PTP-ResHeader, .forum-post__heading, .forum-post__movie-vote, .panel__heading {
            background-color: rgba(7, 11, 22, 0.60) !important;
            backdrop-filter: brightness(1);
        }

        .group_torrent {
            background-color: #2f354669 !important;
            backdrop-filter: brightness(0.8);
        }

        .panel {
            background-color: #2f354669 !important;
            backdrop-filter: brightness(0.8);
        }

        .search-bar__search-field__input {
            background-color: #0b0e1ae0;
            backdrop-filter: brightness(1);
        }

        .table > tbody > tr, .table > thead > tr {
            background-color: #2f354669 !important;
            backdrop-filter: brightness(0.8);
        }

        .movie-page__torrent__panel {
            background-color: #181c2799;
            backdrop-filter: brightness(0.8);
        }


        #PTP-Groupies-Menu {
            margin: 1em 0 1em 0 !important;
        }

        .page__main-content {
            backdrop-filter: blur(5px);
        }

        .table--striped > tbody > tr:nth-child(2n+1) > td, .table--striped > tbody > tr:nth-child(2n+1) > th, .table > tbody > tr.movie-page__torrent--highlighted {
            background-color: #2f354700;
        }

        .mediainfo--in-release-description .mediainfo__section > tbody > tr, .mediainfo--in-release-description > tbody > tr {
            background-color: #242a3c00 !important;
        }

        blockquote {
            background-color: #181c277a;
        }
    `

    // Audionut Theme CSS
    const audionutCSS = `
        * {
            background-color: transparent !important;
            color: rgba(255, 255, 255, 0.8) !important; /* Adjust transparency of text */
            border-color: transparent !important;
            box-shadow: none !important;
        }

        img, video, canvas, iframe {
            opacity: 0.9 !important; /* Make media elements slightly visible */
        }

        .panel__heading {
            background-color: rgba(0, 0, 0, 0.3) !important; /* Reduce transparency for better visibility */
            color: rgba(255, 255, 255, 1.0) !important; /* Make text fully visible */
        }

        .panel__body {
            background-color: rgba(0, 0, 0, 0.3) !important; /* Reduce transparency for better visibility */
            color: rgba(255, 255, 255, 1.0) !important; /* Make text fully visible */
        }

        .group_torrent {
            background-color: rgba(0, 0, 0, 0.2) !important; /* Reduce transparency for torrent rows */
            color: rgba(255, 255, 255, 0.3) !important; /* Ensure text is more readable */
        }

        .forum-post__textarea {
            background-color: rgba(0, 0, 0, 0.8) !important; /* Reduce transparency for torrent rows */
            color: rgba(255, 255, 255, 0.9) !important; /* Ensure text is more readable */
        }

        .user-info-bar {
            background-color: rgba(0, 0, 0, 0.2) !important; /* Reduce transparency for torrent rows */
            color: rgba(255, 255, 255, 0.3) !important; /* Ensure text is more readable */
        }

        .main-menu {
            background-color: rgba(0, 0, 0, 0.2) !important; /* Reduce transparency for torrent rows */
            color: rgba(255, 255, 255, 0.3) !important; /* Ensure text is more readable */
        }

        .search-bar__list {
            background-color: rgba(0, 0, 0, 0.2) !important; /* Reduce transparency for torrent rows */
            color: rgba(255, 255, 255, 0.3) !important; /* Ensure text is more readable */
        }
    `;

    // Apply initial styles to hide content immediately
    function applyInitialStyles() {
        if (CONFIG.hideUntilLoaded) {
            const styleElement = document.createElement('style');
            styleElement.id = 'ptp-fanart-initial-styles';
            styleElement.textContent = `
                /* Hide body content initially */
                html, body {
                    /* Removed overflow:hidden to allow default scrolling behavior */
                }

                /* Hide all content containers immediately */
                #wrapper, #content, .site-logo__link, .page__main-content, .user-info-bar {
                    opacity: 0 !important;
                    visibility: hidden !important;
                }

                /* Create overlay */
                body::before {
                    content: "";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(9, 12, 24, 1);
                    z-index: 10000;
                    transition: opacity 0.5s ease;
                }

                /* Loading text and spinner */
                body::after {
                    content: "Loading artwork...";
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -70px);
                    font-size: 24px;
                    color: #fff;
                    font-family: "Open Sans", sans-serif;
                    z-index: 10001;
                    text-align: center;
                }

                /* Spinner */
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                #ptp-fanart-spinner {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    width: 50px;
                    height: 50px;
                    margin-top: 15px;
                    margin-left: -25px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    z-index: 10001;
                    animation: spin 1s ease-in-out infinite;
                }
            `;

            // Handle the case where document.head doesn't exist yet
            const addStyle = () => {
                if (document.head) {
                    document.head.appendChild(styleElement);
                } else {
                    // If head doesn't exist yet, wait for it
                    document.addEventListener('DOMContentLoaded', () => {
                        document.head.appendChild(styleElement);
                    }, { once: true });
                }
            };

            addStyle();

            // Add spinner element to the body when it's available
            const addSpinner = () => {
                const spinner = document.createElement('div');
                spinner.id = 'ptp-fanart-spinner';

                if (document.body) {
                    document.body.appendChild(spinner);
                } else {
                    // If body isn't available yet, wait for it
                    document.addEventListener('DOMContentLoaded', () => {
                        document.body.appendChild(spinner);
                    }, { once: true });
                }
            };

            addSpinner();
        }
    }

    // Apply initial styles immediately
    applyInitialStyles();

    // Cache management functions
    function getCachedData(key) {
        const cachedData = GM_getValue(key, null);
        if (!cachedData) return null;

        try {
            const { timestamp, data } = JSON.parse(cachedData);
            // Check if cache is expired
            if (Date.now() - timestamp > CONFIG.cacheExpiry) {
                GM_setValue(key, null);
                return null;
            }
            return data;
        } catch (e) {
            console.error('PTP Fanart: Error parsing cached data', e);
            return null;
        }
    }

    function setCachedData(key, data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        const jsonString = JSON.stringify(cacheData);

        // Log the actual storage sizes for debugging
        if (CONFIG.enableDebug) {
            const originalDataSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
            const finalStorageSize = jsonString.length;
            log(`Storage sizes for ${key}:`);
            log(`  Original data: ${Math.round(originalDataSize/1024)}KB`);
            log(`  Final storage: ${Math.round(finalStorageSize/1024)}KB`);
            log(`  Data type: ${typeof data}`);
            log(`  Is compressed: ${typeof data === 'string' && (data.startsWith('lz:') || data.startsWith('lzc:')) ? 'YES' : 'NO'}`);
            if (typeof data === 'string' && data.startsWith('lzc:')) {
                log(`  Compressed data length: ${data.substring(4).length}`);
            } else if (typeof data === 'string' && data.startsWith('lz:')) {
                log(`  Compressed data length: ${data.substring(3).length}`);
            }
        }

        GM_setValue(key, jsonString);
    }

    // Get IMDb ID from the page
    function getImdbId() {
        const imdbLink = document.querySelector('a[href*="imdb.com/title/tt"]');
        if (!imdbLink) return null;

        const match = imdbLink.href.match(/tt\d+/);
        return match ? match[0] : null;
    }

    // Fetch artwork from Fanart.tv
    function fetchArtwork(imdbId) {
        const cacheKey = `fanart_${imdbId}`;
        const cachedData = getCachedData(cacheKey);

        if (cachedData) {
            log('Using cached artwork data for', imdbId);
            return Promise.resolve(cachedData);
        }

        log('Fetching artwork data for', imdbId);

        return new Promise((resolve, reject) => {
            const url = `https://webservice.fanart.tv/v3/movies/${imdbId}?api_key=${FANART_API_KEY}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            setCachedData(cacheKey, data);
                            log('Successfully fetched and cached artwork data');
                            resolve(data);
                        } catch (e) {
                            log('Error parsing JSON:', e);
                            reject(e);
                        }
                    } else {
                        log('API request failed:', response.status, response.statusText);
                        reject(new Error(`API request failed: ${response.status} ${response.statusText}`));
                    }
                },
                onerror: function(error) {
                    log('API request error:', error);
                    reject(error);
                }
            });
        });
    }

    // Get the best background image from Fanart.tv data
    function getBestBackground(data) {
        const backgroundImages = [];
        const maxImages = CONFIG.maxBackgroundImages;

        // First preference: moviebackground
        if (data.moviebackground && data.moviebackground.length > 0) {
            // Add up to maxImages moviebackground images
            const maxBgImages = Math.min(data.moviebackground.length, maxImages);
            for (let i = 0; i < maxBgImages; i++) {
                backgroundImages.push(data.moviebackground[i].url);
            }
        }

        // Second preference: moviethumb
        if (backgroundImages.length < maxImages && data.moviethumb && data.moviethumb.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxThumbImages = Math.min(data.moviethumb.length, remainingSlots);
            for (let i = 0; i < maxThumbImages; i++) {
                backgroundImages.push(data.moviethumb[i].url);
            }
        }

        // Third preference: hdmovieclearart
        if (backgroundImages.length < maxImages && data.hdmovieclearart && data.hdmovieclearart.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxClearartImages = Math.min(data.hdmovieclearart.length, remainingSlots);
            for (let i = 0; i < maxClearartImages; i++) {
                backgroundImages.push(data.hdmovieclearart[i].url);
            }
        }

        // Fallback: movieposter
        if (backgroundImages.length < maxImages && data.movieposter && data.movieposter.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxPosterImages = Math.min(data.movieposter.length, remainingSlots);
            for (let i = 0; i < maxPosterImages; i++) {
                backgroundImages.push(data.movieposter[i].url);
            }
        }

        // Return all found images, or null if none found
        return backgroundImages.length > 0 ? backgroundImages : null;
    }

    // Get the best logo from Fanart.tv data
    function getBestLogo(data) {

        // First check for HD movie logo in preferred language
        if (data.hdmovielogo) {
            const originalLangLogo = data.hdmovielogo.find(logo => logo.lang === CONFIG.languageISO);
            if (originalLangLogo) return originalLangLogo.url;
        }

        // Then check for standard movie logo in preferred language
        if (data.movielogo) {
            const originalLangLogo = data.movielogo.find(logo => logo.lang === CONFIG.languageISO);
            if (originalLangLogo) return originalLangLogo.url;
        }

        // Fallback to other languages if preferred language is not available

        // First preference: hdmovielogo
        if (data.hdmovielogo && data.hdmovielogo.length > 0) {
            return data.hdmovielogo[0].url;
        }

        // Second preference: movielogo
        if (data.movielogo && data.movielogo.length > 0) {
            return data.movielogo[0].url;
        }

        // Third preference: moviedisc (less ideal but can work)
        if (data.moviedisc && data.moviedisc.length > 0) {
            return data.moviedisc[0].url;
        }

        return null;
    }

    // Apply the background with blur and overlay
    function applyBackground(imageUrl) {
        // Create background div if it doesn't exist
        let backgroundDiv = document.getElementById('ptp-fanart-background');
        if (!backgroundDiv) {
            backgroundDiv = document.createElement('div');
            backgroundDiv.id = 'ptp-fanart-background';
            document.body.insertBefore(backgroundDiv, document.body.firstChild);
        }

        const css = `
            #ptp-fanart-background {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
                background: linear-gradient(rgba(9, 12, 24, ${CONFIG.darkOverlayOpacity}), rgba(30, 35, 51, ${CONFIG.darkOverlayOpacity})),
                            url("${imageUrl}") !important;
                background-size: cover !important;
                background-position: center center !important;
                background-attachment: unset !important;
                background-repeat: no-repeat !important;
                filter: blur(${CONFIG.blurAmount}px);
                transform: scale(1.05); /* Prevent blur edges from showing */
                transition: opacity 0.3s ease-in-out; /* Add transition for smoother appearance */
                will-change: background-image, opacity; /* Hint browser to optimize these properties */
            }

            body {
                background: transparent !important;
                margin: 0 auto;
                background-attachment: unset !important;
            }

            #wrapper {
                background: transparent !important;
                background-attachment: unset !important;
            }

            #content {
            }

            .page__main-content {
                background: #1e2333b0;
            }

            .search-bar {
                background: #2f3447b0;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }

    // Remove initial styles and show content
    function showContent() {
        if (CONFIG.hideUntilLoaded) {

            // Fade out overlay and spinner
            const initialStyles = document.getElementById('ptp-fanart-initial-styles');
            if (initialStyles) {
                initialStyles.textContent = `
                    /* Remove overlay with transition */
                    html, body {
                    }

                    body::before {
                        opacity: 0;
                        transition: opacity 1.2s ease;
                        pointer-events: none;
                    }

                    body::after {
                        opacity: 0;
                        transition: opacity 1.2s ease;
                        pointer-events: none;
                    }

                    #ptp-fanart-spinner {
                        opacity: 0;
                        transition: opacity 1.2s ease;
                        pointer-events: none;
                    }

                    /* After transition completes, hide elements completely */
                    @keyframes hideCompletely {
                        to {
                            visibility: hidden;
                        }
                    }

                    body::before, body::after, #ptp-fanart-spinner {
                        animation: hideCompletely 0s 1.3s forwards;
                    }
                `;
            }

            // Remove spinner after transition
            setTimeout(() => {
                const spinner = document.getElementById('ptp-fanart-spinner');
                if (spinner && spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
            }, 1500); // Extended to match the longer transition time
        }

        // Apply theme CSS
        if (CONFIG.theme === 'Audionut') {
            GM_addStyle(audionutCSS);
        } else {
            GM_addStyle(defaultCSS);
        }
    }

    // Replace the site logo with movie logo from fanart.tv
    function replaceSiteLogo(logoUrl) {
        const siteLogoLink = document.querySelector('.site-logo__link');
        if (!siteLogoLink) {
            console.log('PTP Fanart: Site logo element not found');
            return;
        }

        // Hide the original ::after element
        const css = `
            .site-logo__link::after {
                display: none !important;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);

        // Create a new image element for the logo
        const newLogo = document.createElement('img');
        newLogo.src = logoUrl;
        newLogo.style.maxWidth = '500px';
        newLogo.style.objectFit = 'contain';
        newLogo.style.width = '100%';
        newLogo.style.height = 'auto';
        newLogo.style.marginBottom = '1rem';

        // Add the logo to the site-logo__link element
        siteLogoLink.appendChild(newLogo);

        // Call the margin adjustment function initially
        adjustLogoMargin();

        // Add resize event listener to adjust margin when window size changes
        window.addEventListener('resize', adjustLogoMargin);

        console.log('PTP Fanart: Site logo replaced successfully');
        return true;
    }

    // Function to adjust the site logo margin based on user-info-bar height
    function adjustLogoMargin() {
        const siteLogoLink = document.querySelector('.site-logo__link');
        const userInfoBar = document.querySelector('.user-info-bar');

        if (!siteLogoLink || !userInfoBar) return;

        // Get the computed height of the user-info-bar
        const userInfoBarHeight = userInfoBar.getBoundingClientRect().height;

        // Base margin is 2.5rem
        let marginTop = 2.5;

        // Lower the threshold to 50px to catch the mobile view case
        // User reported seeing 56px height in mobile view
        if (userInfoBarHeight > 50) {
            marginTop = 3.5;
        }

        // Apply the calculated margin
        siteLogoLink.style.marginTop = `${marginTop}rem`;

        console.log(`PTP Fanart: Adjusted logo margin-top to ${marginTop}rem (user-info-bar height: ${userInfoBarHeight}px)`);
    }

    function compressBase64(base64String) {
        try {
            // Remove data URL prefix if present
            const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

            log(`Attempting compression on ${Math.round(base64Data.length/1024)}KB of base64 data`);

            // Use LZ-string compression - try regular compress first (it works better for base64)
            if (typeof LZString !== 'undefined') {
                const compressed = LZString.compress(base64Data);

                // Only use compressed version if it's actually smaller
                if (compressed && compressed.length < base64Data.length) {
                    const originalSize = base64Data.length;
                    const compressedSize = compressed.length;
                    const reduction = Math.round((1 - compressedSize/originalSize) * 100);

                    log(`✓ LZ-string compression successful: ${Math.round(originalSize/1024)}KB -> ${Math.round(compressedSize/1024)}KB (${reduction}% reduction)`);
                    return `lzc:${compressed}`;
                } else {
                    log(`✗ LZ-string compression not beneficial, trying compressToBase64`);

                    // Fallback to compressToBase64 if regular compress doesn't work
                    const compressedBase64 = LZString.compressToBase64(base64Data);
                    if (compressedBase64 && compressedBase64.length < base64Data.length) {
                        const reduction = Math.round((1 - compressedBase64.length/base64Data.length) * 100);
                        log(`✓ Alternative compression successful: ${Math.round(base64Data.length/1024)}KB -> ${Math.round(compressedBase64.length/1024)}KB (${reduction}% reduction)`);
                        return `lz:${compressedBase64}`;
                    }

                    log('All compression methods failed, using original');
                    return base64String;
                }
            } else {
                log('LZ-string not available, using original');
                return base64String;
            }

        } catch (error) {
            console.warn('PTP Fanart: Compression failed, using original', error);
            return base64String;
        }
    }

    function decompressBase64(compressedData) {
        try {
            // Check if data is LZ-string compressed
            if (typeof compressedData === 'string') {
                if (compressedData.startsWith('lz:')) {
                    if (typeof LZString !== 'undefined') {
                        const compressedBase64 = compressedData.substring(3);
                        const decompressed = LZString.decompressFromBase64(compressedBase64);

                        if (decompressed) {
                            return `data:image/jpeg;base64,${decompressed}`;
                        } else {
                            console.warn('PTP Fanart: LZ-string decompression failed');
                            return compressedData;
                        }
                    }
                } else if (compressedData.startsWith('lzc:')) {
                    if (typeof LZString !== 'undefined') {
                        const compressed = compressedData.substring(4);
                        const decompressed = LZString.decompress(compressed);

                        if (decompressed) {
                            return `data:image/jpeg;base64,${decompressed}`;
                        } else {
                            console.warn('PTP Fanart: Alternative LZ decompression failed');
                            return compressedData;
                        }
                    }
                }
            }

            // Return as-is if not compressed
            return compressedData;

        } catch (error) {
            console.warn('PTP Fanart: Decompression failed, using original', error);
            return compressedData;
        }
    }

    // Enhanced preloadImage function with base64 caching (first image only)
    function preloadImageAndCache(url, cacheKey, shouldCache = false) {
        // Check if we have a cached base64 version
        if (shouldCache) {
            const cachedBase64 = getCachedData(`${cacheKey}_base64`);
            if (cachedBase64) {
                log('Using cached base64 image for', cacheKey);
                return Promise.resolve(decompressBase64(cachedBase64));
            }
        }

        log('Fetching image', shouldCache ? 'and caching as base64' : '', 'for', cacheKey);

        return new Promise((resolve, reject) => {
            if (shouldCache) {
                // Use GM_xmlhttpRequest for cross-origin image requests
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    onload: function(response) {
                        if (response.status === 200) {
                            // Convert blob to base64
                            const reader = new FileReader();
                            reader.onload = () => {
                                const base64 = reader.result;
                                const compressed = compressBase64(base64);
                                setCachedData(`${cacheKey}_base64`, compressed);
                                log(`Cached base64 image (${Math.round(base64.length / 1024)}KB) for`, cacheKey);
                                resolve(base64);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(response.response);
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    }
                });
            } else {
                // Just preload without caching using regular image loading
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(`Failed to load image: ${url}`);
                img.crossOrigin = 'anonymous'; // Add this for cross-origin images
                img.src = url;
            }
        });
    }

    // Main execution
    async function init() {
        console.log('PING');
        try {
            const pageUrl = window.location.href;
            const cacheKeyBase = pageUrl.split('?')[0] + (pageUrl.match(/id=(\d+)/) ? pageUrl.match(/id=(\d+)/)[1] : '');

            // Check for cached base64 background first
            const cachedBackgroundBase64 = getCachedData(`${cacheKeyBase}_background_base64`);
            if (cachedBackgroundBase64) {
                log('Found cached base64 background, applying immediately');
                applyBackground(decompressBase64(cachedBackgroundBase64));
            }

            // Get IMDB ID and artwork data (existing logic)
            let imdbId = getCachedData(`${cacheKeyBase}_imdbId`);
            if (!imdbId) {
                imdbId = await getImdbId();
                if (imdbId) {
                    setCachedData(`${cacheKeyBase}_imdbId`, imdbId);
                }
            }

            let artworkData = getCachedData(`${cacheKeyBase}_artwork`);
            if (!artworkData && imdbId) {
                artworkData = await fetchArtwork(imdbId);
                if (artworkData) {
                    setCachedData(`${cacheKeyBase}_artwork`, artworkData);
                }
            }

            // Get URLs from artwork data
            let backgroundUrls = artworkData ? getBestBackground(artworkData) : null;
            const logoUrl = artworkData && CONFIG.replaceSiteLogo ? getBestLogo(artworkData) : null;

            const preloadPromises = [];
            let logoApplied = false;

            // Handle background (cache ONLY the first/primary background)
            if (backgroundUrls && backgroundUrls.length > 0 && !cachedBackgroundBase64) {
                const primaryBackgroundUrl = backgroundUrls[0]; // Use first image only
                preloadPromises.push(
                    preloadImageAndCache(primaryBackgroundUrl, `${cacheKeyBase}_background`, true)
                    .then(base64Url => {
                        applyBackground(base64Url);
                        console.log('PTP Fanart: Background applied and cached as base64');
                    })
                    .catch(error => {
                        console.error('PTP Fanart: Failed to preload/cache background', error);
                    })
                );
            }

            // Handle logo (cache the logo as base64)
            if (logoUrl) {
                const cachedLogoBase64 = getCachedData(`${cacheKeyBase}_logo_base64`);
                if (cachedLogoBase64) {
                    log('Using cached base64 logo');
                    logoApplied = replaceSiteLogo(decompressBase64(cachedLogoBase64));
                } else {
                    preloadPromises.push(
                        preloadImageAndCache(logoUrl, `${cacheKeyBase}_logo`, true)
                        .then(base64Url => {
                            logoApplied = replaceSiteLogo(base64Url);
                            console.log('PTP Fanart: Logo applied and cached as base64');
                        })
                        .catch(error => {
                            console.error('PTP Fanart: Failed to preload/cache logo', error);
                        })
                    );
                }
            }

            // Show content logic (existing)
            if (CONFIG.hideUntilLoaded && preloadPromises.length > 0) {
                await Promise.allSettled(preloadPromises);
                showContent(logoApplied);
            } else {
                setTimeout(() => {
                    showContent(logoApplied);
                }, 100);

                Promise.allSettled(preloadPromises).then(() => {
                    log('All image preloads complete or failed');
                });
            }

        } catch (error) {
            console.error('PTP Fanart: Error in init', error);
            showContent();
        }
    }

    // Start script execution immediately
    function waitForImdb() {
        // Try to find IMDB link
        const imdbLink = document.querySelector('#imdb-title-link');
        console.log('PTP Fanart: IMDB link:', imdbLink);
        if (imdbLink) {
            // Elements already exist, start immediately
            init();
            return;
        }

        // Set up mutation observer to watch for these elements
        const observer = new MutationObserver((mutations, obs) => {
            const imdbLink = document.querySelector('#imdb-title-link');
            if (imdbLink) {
                obs.disconnect(); // Stop observing once found
                console.log('PTP Fanart: IMDB link:', imdbLink);
                init();
            }
        });

        // Start observing as soon as body is available
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            // If body isn't available yet, set up a listener for it
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: true });
            }, { once: true });
        }

        // Fallback: Start after a timeout even if elements aren't found
        setTimeout(() => {
            observer.disconnect();
            if (!document.querySelector('#imdb-title-link')) {
                console.log('PTP Fanart: Timeout waiting for IMDB link, starting anyway');
                init();
            }
        }, 5000);
    }

    // Start immediately
    waitForImdb();
})();
