// ==UserScript==
// @name         MTV Fanart Background & Logo
// @version      1.0.0
// @description  Replaces MTV background and logo with Fanart artwork and applies blur + dark overlay for movies and series
// @author       BEY0NDER
// @namespace    https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/mtv/mtv_fanart.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/mtv/mtv_fanart.user.js
// @match        *://*morethantv.me/torrents.php?id=*
// @match        *://*morethantv.me/show/*
// @exclude      *://*morethantv.me/show/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @connect      webservice.fanart.tv
// @connect      assets.fanart.tv
// @connect      thetvdb.com
// @icon         https://morethantv.me/favicon.ico
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let saved;

    // Initialize GM_config for settings
    GM_config.init({
        'id': 'MTV_Fanart_Config',
        'title': `
            <div>
                <div style="user-select: none; font-family: 'Bebas Neue', Helvetica, Tahoma, Geneva, sans-serif; background-color: #b1956e; -webkit-background-clip: text; -webkit-text-fill-color: transparent; -webkit-filter: brightness(110%); filter: brightness(110%); transition: all 0.3s; font-weight: bold; padding-top: 3%;">
                    MTV Fanart Settings<br>
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
            }
        },
        "events": {
            "open": function (doc) {
                let style = this.frame.style;
                style.width = "420px";
                style.height = "640px";
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
                // versionEl.href = 'https://morethantv.me';
                doc.getElementById('MTV_Fanart_Config_buttons_holder').appendChild(versionEl);

                // Add success animation to save button
                const saveButton = doc.getElementById('MTV_Fanart_Config_saveBtn');
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
                    const checkboxVar = doc.getElementById(`MTV_Fanart_Config_${field}_var`);
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
                    const sliderVar = doc.getElementById(`MTV_Fanart_Config_${field}_var`);
                    if (sliderVar) {
                        sliderVar.classList.add('slider-section');
                    }
                });
            },
            "save": function () {
                saved = true;
                // Clear cached data when settings are saved
                GM_listValues().forEach(key => {
                    if (key !== 'MTV_Fanart_Config') {
                        GM_setValue(key, null);
                    }
                });
                console.log('MTV Fanart: Cleared cache data after settings change');
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
            #MTV_Fanart_Config {
                background: #1a1a1a;
                margin: 0;
                padding: 10px 20px;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #MTV_Fanart_Config .config_header {
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
            #MTV_Fanart_Config .config_var {
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
            #MTV_Fanart_Config .field_label {
                color: #fff;
                width: 45%;
                user-select: none;
                font-weight: 500;
            }
            #MTV_Fanart_Config .field_label.disabled {
                color: #B0BEC5;
            }
            #MTV_Fanart_Config input[type="text"],
            #MTV_Fanart_Config input[type="number"],
            #MTV_Fanart_Config select {
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #ddd;
                border-radius: 3px;
                box-sizing: border-box;
                font-size: 0.9em;
                padding: 8px;
                width: 55%;
                transition: all 0.3s ease;
            }
            #MTV_Fanart_Config input[type="text"]:focus,
            #MTV_Fanart_Config input[type="number"]:focus,
            #MTV_Fanart_Config select:focus {
                border-color: #2C3E50;
                box-shadow: 0 0 5px rgba(255, 128, 0, 0.5);
                outline: none;
            }
            #MTV_Fanart_Config input[type="checkbox"] {
                cursor: pointer;
                margin-right: 4px !important;
                width: 16px;
                height: 16px;
            }
            #MTV_Fanart_Config .reset {
                color: #95a5a6;
                text-decoration: none;
                user-select: none;
            }
            #MTV_Fanart_Config_buttons_holder {
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
            #MTV_Fanart_Config .reset_holder {
                grid-column: 3;
                grid-row: 2;
            }
            #MTV_Fanart_Config .version_label {
                grid-column: 1;
                grid-row: 2;
                text-align: left !important;
            }
            #MTV_Fanart_Config_resetLink {
                text-transform: lowercase;
                background: transparent;
                color: #95a5a6;
            }
            #MTV_Fanart_Config .version_label:hover,
            #MTV_Fanart_Config_resetLink:hover {
                text-decoration: underline;
            }
            #MTV_Fanart_Config .saveclose_buttons {
                margin: 22px 0px 4px;
            }
            #MTV_Fanart_Config_saveBtn {
                grid-column: 2;
                grid-row: 1;
                background-color: #373737;
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
            #MTV_Fanart_Config_saveBtn:hover {
                background-color: #4d4d4dff;
                transform: translateY(-2px);
            }
            #MTV_Fanart_Config_saveBtn:active {
                background-color: #fd9b3a;
                transform: translateY(1px);
            }
            #MTV_Fanart_Config_saveBtn.success {
                box-shadow: 0 0 6px 3px rgba(253, 155, 58, 0.6);
            }
            #MTV_Fanart_Config_closeBtn {
                grid-column: 3;
                grid-row: 1;
                background-color: #373737;
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
            #MTV_Fanart_Config_closeBtn:hover {
                background-color: #4d4d4dff;
                transform: translateY(-2px);
            }
            #MTV_Fanart_Config_closeBtn:active {
                background-color: #4d4d4dff;
                transform: translateY(1px);
            }
            /* Tooltip styling */
            #MTV_Fanart_Config .field_label[title]:hover::after {
                content: attr(title);
                position: absolute;
                background: #4d4d4dff;
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
    GM_registerMenuCommand('MTV Fanart Settings', () => {
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
    };

    // Debug logging function
    const log = (...args) => {
        if (CONFIG.enableDebug) {
            console.log('[MTV Fanart]', ...args);
        }
    };

    // Log settings if debug is enabled
    log('Script initialized with settings:', {
        FANART_API_KEY: FANART_API_KEY ? '✓ Set' : '✗ Not set',
        CONFIG
    });

    // Default CSS
    const defaultCSS = `
        .panel__body, .sidebar .box, .news_post .pad, .main_column .box, .main_column2 .box, #scontent .box, .sidebar .box, .news_post .pad, .main-column .box, .main-column2 .box, #scontent .box {
            background: #26262680;
        }

        form.search_form, .box.pad, #blog .box, .box.thin.clear, .group_torrent, .torrent_table {
            background: #26262680;
        }

        .toggleable-search-form__toggler-container, thead th, .forum-post__heading, .panel__heading, .box.filter_torrents .head, #inbox .box .head, #inbox .box .head, #reply_box h3, #inbox form .send_form #quickpost h3, .sidebar .box .head, .box.news_post .head, .main_column .box .head, .head, tr.colhead, tr.colhead_dark {
            background: rgba(0, 0, 0, 0.7) !important;
            border-bottom: unset !important;
        }

        .colhead td, .colhead_dark td {
            background: unset !important;
            border-bottom: unset !important;
        }

        div#quickreplytext, #user .main_column table[cellpadding="0"] {
            background: unset !important;
        }

        td {
            border-bottom: unset !important;
        }

        .group td {
            background: #26262680 !important;
        }

        .sidebar {
            background: #26262680 !important;
            padding: 0 !important;
        }

        .mediainfo {
            background: #26262691 !important;
        }

        td {
            background: #fff0 !important;
        }
    `

    // Apply initial styles to hide content immediately
    function applyInitialStyles() {
        if (CONFIG.hideUntilLoaded) {
            const styleElement = document.createElement('style');
            styleElement.id = 'mtv-fanart-initial-styles';
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
                    background-color: #1a1a1a;
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

                #mtv-fanart-spinner {
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
                spinner.id = 'mtv-fanart-spinner';

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
            console.error('MTV Fanart: Error parsing cached data', e);
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

    // Check if current page is for a series
    function isSeriesPage() {
        const showRegex = /\/show\//;
        if (showRegex.test(window.location.href)) {
            return true;
        }

        const titleElement = document.querySelector('head > title:nth-child(1)');
        if (!titleElement) {
            log('Title element not found');
            return false;
        }
            
        const title = titleElement.textContent.trim();
        const seasonRegex = /- (S\d+E\d+|Season \d+)/;
        if (seasonRegex.test(title)) {
            return true;
        }

        return false;
    }

    // Get media ID (IMDb for movies, TVDB for series) from the page
    async function getMediaId() {
        const isSeries = isSeriesPage();
        
        if (isSeries) {
            // For series, get TVDB ID from the third metalinks item
            const tvdbLink = document.querySelector('.metalinks > li:nth-child(3) > a[href*="thetvdb.com"]');
            if (!tvdbLink) {
                log('TVDB link not found for series');
                return null;
            }
            
            const match = tvdbLink.href.match(/[?&]id=(\d+)/);
            if (match) {
                return {
                    id: match[1],
                    type: 'series'
                };
            }
            log('Could not extract TVDB ID from link:', tvdbLink.href);
            return null;
        } else {
            // For movies, check if title contains "Main Feature"
            const titleElement = document.querySelector('head > title:nth-child(1)');
            if (!titleElement) {
                log('Title element not found');
                return null;
            }
            
            const title = titleElement.textContent.trim();
            if (!title.includes('Main Feature')) {
                log('Title does not contain "Main Feature", stopping processing:', title);
                return null;
            }
            
            // Get IMDb ID from the first metalinks item
            const imdbLink = document.querySelector('.metalinks > li:nth-child(1) > a[href*="imdb.com/title/tt"]');
            if (!imdbLink) {
                log('IMDb link not found for movie');
                return null;
            }
            
            const match = imdbLink.href.match(/tt\d+/);
            if (match) {
                return {
                    id: match[0],
                    type: 'movie'
                };
            }
            log('Could not extract IMDb ID from link:', imdbLink.href);
            return null;
        }
    }

    // Fetch artwork from Fanart.tv
    function fetchArtwork(mediaInfo) {
        const { id, type } = mediaInfo;
        const cacheKey = `fanart_${type}_${id}`;
        const cachedData = getCachedData(cacheKey);

        if (cachedData) {
            log('Using cached artwork data for', type, id);
            return Promise.resolve(cachedData);
        }

        log('Fetching artwork data for', type, id);

        return new Promise((resolve, reject) => {
            // Use appropriate API endpoint based on media type
            const endpoint = type === 'series' ? 'tv' : 'movies';
            const url = `https://webservice.fanart.tv/v3/${endpoint}/${id}?api_key=${FANART_API_KEY}`;

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

    // Get the best background image from Fanart.tv data (works for both movies and series)
    function getBestBackground(data, mediaType) {
        const backgroundImages = [];
        const maxImages = CONFIG.maxBackgroundImages;

        if (mediaType === 'series') {
            // For series: showbackground, tvthumb, etc.
            if (data.showbackground && data.showbackground.length > 0) {
                const maxBgImages = Math.min(data.showbackground.length, maxImages);
                for (let i = 0; i < maxBgImages; i++) {
                    backgroundImages.push(data.showbackground[i].url);
                }
            }
            
            if (backgroundImages.length < maxImages && data.tvthumb && data.tvthumb.length > 0) {
                const remainingSlots = maxImages - backgroundImages.length;
                const maxThumbImages = Math.min(data.tvthumb.length, remainingSlots);
                for (let i = 0; i < maxThumbImages; i++) {
                    backgroundImages.push(data.tvthumb[i].url);
                }
            }
            
            if (backgroundImages.length < maxImages && data.tvposter && data.tvposter.length > 0) {
                const remainingSlots = maxImages - backgroundImages.length;
                const maxPosterImages = Math.min(data.tvposter.length, remainingSlots);
                for (let i = 0; i < maxPosterImages; i++) {
                    backgroundImages.push(data.tvposter[i].url);
                }
            }
        } else {
            // For movies: moviebackground, moviethumb, etc.
            if (data.moviebackground && data.moviebackground.length > 0) {
                const maxBgImages = Math.min(data.moviebackground.length, maxImages);
                for (let i = 0; i < maxBgImages; i++) {
                    backgroundImages.push(data.moviebackground[i].url);
                }
            }

            if (backgroundImages.length < maxImages && data.moviethumb && data.moviethumb.length > 0) {
                const remainingSlots = maxImages - backgroundImages.length;
                const maxThumbImages = Math.min(data.moviethumb.length, remainingSlots);
                for (let i = 0; i < maxThumbImages; i++) {
                    backgroundImages.push(data.moviethumb[i].url);
                }
            }

            if (backgroundImages.length < maxImages && data.hdmovieclearart && data.hdmovieclearart.length > 0) {
                const remainingSlots = maxImages - backgroundImages.length;
                const maxClearartImages = Math.min(data.hdmovieclearart.length, remainingSlots);
                for (let i = 0; i < maxClearartImages; i++) {
                    backgroundImages.push(data.hdmovieclearart[i].url);
                }
            }

            if (backgroundImages.length < maxImages && data.movieposter && data.movieposter.length > 0) {
                const remainingSlots = maxImages - backgroundImages.length;
                const maxPosterImages = Math.min(data.movieposter.length, remainingSlots);
                for (let i = 0; i < maxPosterImages; i++) {
                    backgroundImages.push(data.movieposter[i].url);
                }
            }
        }

        // Return all found images, or null if none found
        return backgroundImages.length > 0 ? backgroundImages : null;
    }

    // Get the best logo from Fanart.tv data (works for both movies and series)
    function getBestLogo(data, mediaType) {
        if (mediaType === 'series') {
            // For series: hdtvlogo, clearlogo
            if (data.hdtvlogo) {
                const originalLangLogo = data.hdtvlogo.find(logo => logo.lang === CONFIG.languageISO);
                if (originalLangLogo) return originalLangLogo.url;
            }

            if (data.clearlogo) {
                const originalLangLogo = data.clearlogo.find(logo => logo.lang === CONFIG.languageISO);
                if (originalLangLogo) return originalLangLogo.url;
            }

            // Fallback to any language
            if (data.hdtvlogo && data.hdtvlogo.length > 0) {
                return data.hdtvlogo[0].url;
            }

            if (data.clearlogo && data.clearlogo.length > 0) {
                return data.clearlogo[0].url;
            }
        } else {
            // For movies: hdmovielogo, movielogo
            if (data.hdmovielogo) {
                const originalLangLogo = data.hdmovielogo.find(logo => logo.lang === CONFIG.languageISO);
                if (originalLangLogo) return originalLangLogo.url;
            }

            if (data.movielogo) {
                const originalLangLogo = data.movielogo.find(logo => logo.lang === CONFIG.languageISO);
                if (originalLangLogo) return originalLangLogo.url;
            }

            // Fallback to other languages
            if (data.hdmovielogo && data.hdmovielogo.length > 0) {
                return data.hdmovielogo[0].url;
            }

            if (data.movielogo && data.movielogo.length > 0) {
                return data.movielogo[0].url;
            }

            if (data.moviedisc && data.moviedisc.length > 0) {
                return data.moviedisc[0].url;
            }
        }

        return null;
    }

    // Apply the background with blur and overlay
    function applyBackground(imageUrl) {
        // Create background div if it doesn't exist
        let backgroundDiv = document.getElementById('mtv-fanart-background');
        if (!backgroundDiv) {
            backgroundDiv = document.createElement('div');
            backgroundDiv.id = 'mtv-fanart-background';
            document.body.insertBefore(backgroundDiv, document.body.firstChild);
        }

        const css = `
            #mtv-fanart-background {
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
            const initialStyles = document.getElementById('mtv-fanart-initial-styles');
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

                    #mtv-fanart-spinner {
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

                    body::before, body::after, #mtv-fanart-spinner {
                        animation: hideCompletely 0s 1.3s forwards;
                    }
                `;
            }

            // Remove spinner after transition
            setTimeout(() => {
                const spinner = document.getElementById('mtv-fanart-spinner');
                if (spinner && spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
            }, 1500); // Extended to match the longer transition time
        }

        GM_addStyle(defaultCSS);
    }

    // Replace the site logo with movie logo from fanart.tv
    function replaceSiteLogo(logoUrl) {
        const siteLogoLink = document.querySelector('#logo');
        if (!siteLogoLink) {
            console.log('MTV Fanart: Site logo element not found');
            return;
        }

        const css = `

            #logo {
                background-image: none !important;
            }

            #logo > a {
                display: none !important;
            }

            div#logo {
                width: unset !important;
                height: unset !important;
            }

            #logo:hover {
                -webkit-animation: none !important;
                animation: none !important;
            }

            #userinfo_username li ul {
                top: 295px !important;
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

        // Add the logo to the site-logo__link element
        siteLogoLink.appendChild(newLogo);

        // Call the margin adjustment function initially
        adjustLogoMargin();

        // Add resize event listener to adjust margin when window size changes
        window.addEventListener('resize', adjustLogoMargin);

        console.log('MTV Fanart: Site logo replaced successfully');
        return true;
    }

    // Function to adjust the site logo margin based on user-info-bar height
    function adjustLogoMargin() {
        const siteLogoLink = document.querySelector('#logo');
        const userInfoBar = document.querySelector('#userinfo');

        if (!siteLogoLink || !userInfoBar) return;

        // Get the computed height of the userinfo
        const userInfoBarHeight = userInfoBar.getBoundingClientRect().height;

        // Base margin is 2.5rem
        let marginTop = 1;

        // Lower the threshold to 50px to catch the mobile view case
        // User reported seeing 56px height in mobile view
        if (userInfoBarHeight > 50) {
            marginTop = 1;
        }

        // Apply the calculated margin
        siteLogoLink.style.marginTop = `${marginTop}rem`;

        console.log(`MTV Fanart: Adjusted logo margin-top to ${marginTop}rem (user-info-bar height: ${userInfoBarHeight}px)`);
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
            console.warn('MTV Fanart: Compression failed, using original', error);
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
                            console.warn('MTV Fanart: LZ-string decompression failed');
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
                            console.warn('MTV Fanart: Alternative LZ decompression failed');
                            return compressedData;
                        }
                    }
                }
            }

            // Return as-is if not compressed
            return compressedData;

        } catch (error) {
            console.warn('MTV Fanart: Decompression failed, using original', error);
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

            // Get media ID (IMDb for movies, TVDB for series) and artwork data
            let mediaInfo = getCachedData(`${cacheKeyBase}_mediaId`);
            if (!mediaInfo) {
                mediaInfo = await getMediaId();
                if (!mediaInfo) {
                    log('No media ID found or processing stopped');
                    showContent();
                    return;
                }
                setCachedData(`${cacheKeyBase}_mediaId`, mediaInfo);
            }

            let artworkData = getCachedData(`${cacheKeyBase}_artwork`);
            if (!artworkData && mediaInfo) {
                artworkData = await fetchArtwork(mediaInfo);
                if (artworkData) {
                    setCachedData(`${cacheKeyBase}_artwork`, artworkData);
                }
            }

            // Get URLs from artwork data
            let backgroundUrls = artworkData ? getBestBackground(artworkData, mediaInfo.type) : null;
            const logoUrl = artworkData && CONFIG.replaceSiteLogo ? getBestLogo(artworkData, mediaInfo.type) : null;

            const preloadPromises = [];
            let logoApplied = false;

            // Handle background (cache ONLY the first/primary background)
            if (backgroundUrls && backgroundUrls.length > 0 && !cachedBackgroundBase64) {
                const primaryBackgroundUrl = backgroundUrls[0]; // Use first image only
                preloadPromises.push(
                    preloadImageAndCache(primaryBackgroundUrl, `${cacheKeyBase}_background`, true)
                    .then(base64Url => {
                        applyBackground(base64Url);
                        console.log('MTV Fanart: Background applied and cached as base64');
                    })
                    .catch(error => {
                        console.error('MTV Fanart: Failed to preload/cache background', error);
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
                            console.log('MTV Fanart: Logo applied and cached as base64');
                        })
                        .catch(error => {
                            console.error('MTV Fanart: Failed to preload/cache logo', error);
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
            console.error('MTV Fanart: Error in init', error);
            showContent();
        }
    }

    // Start script execution immediately
    function waitForImdb() {
        // Try to find IMDB link
        const imdbLink = document.querySelector('#imdb-title-link');
        console.log('MTV Fanart: IMDB link:', imdbLink);
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
                console.log('MTV Fanart: IMDB link:', imdbLink);
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
                console.log('MTV Fanart: Timeout waiting for IMDB link, starting anyway');
                init();
            }
        }, 5000);
    }

    // Start immediately
    waitForImdb();
})();
