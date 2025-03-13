// ==UserScript==
// @name         BTN Fanart Background & Logo
// @version      1.1.1
// @description  Replaces BTN background and logo with Fanart artwork and applies blur + dark overlay for series pages
// @author       BEY0NDER
// @namespace    https://github.com/4n0n3000/pt-scripts
// @homepageURL  https://broadcasthe.net/forums.php?action=viewthread&threadid=37652
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/btn/btn_fanart.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/btn/btn_fanart.js
// @match        *://broadcasthe.net/series.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @connect      webservice.fanart.tv
// @connect      thetvdb.com
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let saved;

    // Initialize GM_config for settings
    GM_config.init({
        'id': 'BTN_Fanart_Config',
        'title': `
            <div>
                <div style="user-select: none; font-family: 'Bebas Neue', Helvetica, Tahoma, Geneva, sans-serif; background-color: #38a0d2; -webkit-background-clip: text; -webkit-text-fill-color: transparent; -webkit-filter: brightness(110%); filter: drop-shadow(1px 1px 5px rgba(56, 160, 210, 0.31)) brightness(130%); transition: all 0.3s; font-weight: bold; padding-top: 3%;">
                    BTN Fanart Settings<br>
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
                'default': 3,
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
                style.height = "630px";
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
                versionEl.href = 'https://broadcasthe.net/forums.php?action=viewthread&threadid=37652'; // Update with actual thread ID
                doc.getElementById('BTN_Fanart_Config_buttons_holder').appendChild(versionEl);

                // Add success animation to save button
                const saveButton = doc.getElementById('BTN_Fanart_Config_saveBtn');
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
                    const checkboxVar = doc.getElementById(`BTN_Fanart_Config_${field}_var`);
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
                    const sliderVar = doc.getElementById(`BTN_Fanart_Config_${field}_var`);
                    if (sliderVar) {
                        sliderVar.classList.add('slider-section');
                    }
                });
            },
            "save": function () {
                saved = true;
                // Clear cached data when settings are saved
                GM_listValues().forEach(key => {
                    if (key !== 'BTN_Fanart_Config') {
                        GM_setValue(key, null);
                    }
                });
                console.log('BTN Fanart: Cleared cache data after settings change');
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
            #BTN_Fanart_Config {
                background: #272727; 
                margin: 0; 
                padding: 10px 20px;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #BTN_Fanart_Config .config_header {
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
            #BTN_Fanart_Config .config_var {
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
            #BTN_Fanart_Config .field_label {
                color: #fff; 
                width: 45%; 
                user-select: none;
                font-weight: 500;
            }
            #BTN_Fanart_Config .field_label.disabled {
                color: #B0BEC5;
            }
            #BTN_Fanart_Config input[type="text"],
            #BTN_Fanart_Config input[type="number"],
            #BTN_Fanart_Config select {
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid #ddd;
                border-radius: 3px;
                box-sizing: border-box;
                font-size: 0.9em;
                padding: 8px;
                width: 55%;
                transition: all 0.3s ease;
            }
            #BTN_Fanart_Config input[type="text"]:focus,
            #BTN_Fanart_Config input[type="number"]:focus,
            #BTN_Fanart_Config select:focus {
                border-color: #2C3E50;
                box-shadow: 0 0 5px rgba(255, 128, 0, 0.5);
                outline: none;
            }
            #BTN_Fanart_Config input[type="checkbox"] {
                cursor: pointer;
                margin-right: 4px !important;
                width: 16px;
                height: 16px;
            }
            #BTN_Fanart_Config .reset {
                color: #95a5a6; 
                text-decoration: none; 
                user-select: none;
            }
            #BTN_Fanart_Config_buttons_holder {
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
            #BTN_Fanart_Config .reset_holder {
                grid-column: 3; 
                grid-row: 2;
            }
            #BTN_Fanart_Config .version_label {
                grid-column: 1; 
                grid-row: 2; 
                text-align: left !important;
            }
            #BTN_Fanart_Config_resetLink {
                text-transform: lowercase;
                background: transparent;
                color: #95a5a6;
            }
            #BTN_Fanart_Config .version_label:hover, 
            #BTN_Fanart_Config_resetLink:hover {
                text-decoration: underline;
            }
            #BTN_Fanart_Config .saveclose_buttons {
                margin: 22px 0px 4px;
            }
            #BTN_Fanart_Config_saveBtn {
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
            #BTN_Fanart_Config_saveBtn:hover {
                background-color: #34495E;
                transform: translateY(-2px);
            }
            #BTN_Fanart_Config_saveBtn:active {
                background-color: #49d0ff;
                transform: translateY(1px);
            }
            #BTN_Fanart_Config_saveBtn.success {
                box-shadow: 0 0 6px 3px rgba(73, 208, 255, 0.6);
            }
            #BTN_Fanart_Config_closeBtn {
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
            #BTN_Fanart_Config_closeBtn:hover {
                background-color: #34495E;
                transform: translateY(-2px);
            }
            #BTN_Fanart_Config_closeBtn:active {
                background-color: #2C3E50;
                transform: translateY(1px);
            }
            /* Tooltip styling */
            #BTN_Fanart_Config .field_label[title]:hover::after {
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
    GM_registerMenuCommand('BTN Fanart Settings', () => {
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
        maxBackgroundImages: GM_config.get('maxBackgroundImages') || 3,
        blurAmount: GM_config.get('blurAmount') !== undefined && GM_config.get('blurAmount') !== '' ? GM_config.get('blurAmount') : 5,
        darkOverlayOpacity: GM_config.get('darkOverlayOpacity') || 0.5,
        enableDebug: GM_config.get('enableDebug') !== undefined ? GM_config.get('enableDebug') : false
    };

    // Debug logging function
    const log = (...args) => {
        if (CONFIG.enableDebug) {
            console.log('[BTN Fanart]', ...args);
        }
    };

    // Apply initial styles to hide content immediately
    function applyInitialStyles() {
        if (CONFIG.hideUntilLoaded) {
            const styleElement = document.createElement('style');
            styleElement.id = 'btn-fanart-initial-styles';
            styleElement.textContent = `
                /* Hide body content initially */
                html, body {
                    overflow: hidden;
                }

                /* Create overlay */
                body::before {
                    content: "";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(39, 39, 39, 1);
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

                #btn-fanart-spinner {
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
                spinner.id = 'btn-fanart-spinner';
                
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
            console.error('BTN Fanart: Error parsing cached data', e);
            return null;
        }
    }

    function setCachedData(key, data) {
        const cacheData = {
            timestamp: Date.now(),
            data: data
        };
        GM_setValue(key, JSON.stringify(cacheData));
    }

    // Get the TVDB URL from the page
    function getTvdbUrl() {
        // First try the modern format: thetvdb.com/series/[slug]
        const tvdbModernLinks = document.querySelectorAll('a[href*="thetvdb.com/series/"]');
        if (tvdbModernLinks && tvdbModernLinks.length > 0) {
            return tvdbModernLinks[0].href;
        }

        // Try the legacy format: thetvdb.com/?tab=series&id=[id]
        const tvdbLegacyLinks = document.querySelectorAll('a[href*="thetvdb.com/?tab=series"]');
        if (tvdbLegacyLinks && tvdbLegacyLinks.length > 0) {
            return tvdbLegacyLinks[0].href;
        }

        return null;
    }

    // Fetch the TVDB ID by scraping the TVDB page
    async function fetchTvdbId(tvdbUrl) {
        // Check if this is a legacy URL with query parameters
        if (tvdbUrl.includes('?tab=series&id=')) {
            // Direct extraction from URL
            const match = tvdbUrl.match(/[?&]id=(\d+)/);
            if (match && match[1]) {
                return Promise.resolve(match[1]);
            }
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: tvdbUrl,
                onload: function(response) {
                    if (response.status === 200) {
                        const parser = new DOMParser();
                        const htmlDoc = parser.parseFromString(response.responseText, 'text/html');

                        // Method 1: Use the specific CSS selector for the ID
                        const idElement = htmlDoc.querySelector('li.list-group-item:nth-child(1) > span:nth-child(2)');
                        if (idElement && idElement.textContent) {
                            const id = idElement.textContent.trim();
                            if (/^\d+$/.test(id)) {
                                return resolve(id);
                            }
                        }

                        // Method 2: Try to find the ID in meta tags
                        const metaTags = htmlDoc.querySelectorAll('meta[property="og:url"], meta[property="al:ios:url"]');
                        for (const tag of metaTags) {
                            const content = tag.getAttribute('content');
                            if (content) {
                                const match = content.match(/\/(\d+)$/);
                                if (match && match[1]) {
                                    return resolve(match[1]);
                                }
                            }
                        }

                        // Method 3: Look for data attributes in the HTML
                        const elements = htmlDoc.querySelectorAll('[data-id]');
                        for (const el of elements) {
                            const id = el.getAttribute('data-id');
                            if (id && /^\d+$/.test(id)) {
                                return resolve(id);
                            }
                        }

                        // Method 4: Check for a series ID in the script tags
                        const scripts = htmlDoc.querySelectorAll('script');
                        for (const script of scripts) {
                            const text = script.textContent;
                            // Look for patterns like "id":12345 or "id": 12345
                            const match = text.match(/"id"\s*:\s*(\d+)/);
                            if (match && match[1]) {
                                return resolve(match[1]);
                            }
                        }

                        reject('Could not find TVDB ID on the page');
                    } else {
                        reject(`Failed to load TVDB page: ${response.status}`);
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    // Get TVDB ID from the page
    async function getTvdbId() {
        const tvdbUrl = getTvdbUrl();
        if (tvdbUrl) {
            try {
                const tvdbId = await fetchTvdbId(tvdbUrl);
                return tvdbId;
            } catch (error) {
                console.error('BTN Fanart: Error fetching TVDB ID', error);
            }
        }

        // As a fallback, check for tvdb ID in banner image URLs
        const bannerImg = document.querySelector('#banner');
        if (bannerImg && bannerImg.src) {
            const match = bannerImg.src.match(/tvdb\/banners\/(?:v\d+\/)?series\/(\d+)\//);
            if (match && match[1]) return match[1];
        }

        return null;
    }

    // Fetch artwork from Fanart.tv
    function fetchArtwork(tvdbId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `http://webservice.fanart.tv/v3/tv/${tvdbId}?api_key=${FANART_API_KEY}`,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    // Get the best background image from Fanart.tv data
    function getBestBackground(data) {
        const backgroundImages = [];
        const maxImages = CONFIG.maxBackgroundImages;

        // First preference: showbackground
        if (data.showbackground && data.showbackground.length > 0) {
            // Add up to maxImages showbackground images
            const maxShowImages = Math.min(data.showbackground.length, maxImages);
            for (let i = 0; i < maxShowImages; i++) {
                backgroundImages.push(data.showbackground[i].url);
            }
        }

        // If we don't have enough images yet, add tvthumb images
        if (backgroundImages.length < maxImages && data.tvthumb && data.tvthumb.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxThumbImages = Math.min(data.tvthumb.length, remainingSlots);
            for (let i = 0; i < maxThumbImages; i++) {
                backgroundImages.push(data.tvthumb[i].url);
            }
        }

        // If we still don't have enough, add hdclearart images
        if (backgroundImages.length < maxImages && data.hdclearart && data.hdclearart.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxClearartImages = Math.min(data.hdclearart.length, remainingSlots);
            for (let i = 0; i < maxClearartImages; i++) {
                backgroundImages.push(data.hdclearart[i].url);
            }
        }

        // Fallback: tvposter if we still need more images
        if (backgroundImages.length < maxImages && data.tvposter && data.tvposter.length > 0) {
            const remainingSlots = maxImages - backgroundImages.length;
            const maxPosterImages = Math.min(data.tvposter.length, remainingSlots);
            for (let i = 0; i < maxPosterImages; i++) {
                backgroundImages.push(data.tvposter[i].url);
            }
        }

        // Return all found images, or null if none found
        return backgroundImages.length > 0 ? backgroundImages : null;
    }

    // Get the best logo from Fanart.tv data
    function getBestLogo(data) {

        // First check for HD TV logo in preferred language
        if (data.hdtvlogo) {
            const originalLangLogo = data.hdtvlogo.find(logo => logo.lang === CONFIG.languageISO);
            if (originalLangLogo) return originalLangLogo.url;
        }

        // Then check for standard TV logo in preferred language
        if (data.tvlogo) {
            const originalLangLogo = data.tvlogo.find(logo => logo.lang === CONFIG.languageISO);
            if (originalLangLogo) return originalLangLogo.url;
        }

        // Fallback to other languages if preferred language is not available

        // First preference: hdtvlogo
        if (data.hdtvlogo && data.hdtvlogo.length > 0) {
            return data.hdtvlogo[0].url;
        }

        // Second preference: tvlogo
        if (data.tvlogo && data.tvlogo.length > 0) {
            return data.tvlogo[0].url;
        }

        // Third preference: clearlogo
        if (data.clearlogo && data.clearlogo.length > 0) {
            return data.clearlogo[0].url;
        }

        return null;
    }

    // Apply the background with blur and overlay
    function applyBackground(imageUrl) {
        const css = `
            body {
                background-image: linear-gradient(rgba(39, 39, 39, 0.8), rgba(45, 46, 46, 0.9)), url("${imageUrl}") !important;
                background-size: cover !important;
                background-position: center center !important;
                background-attachment: fixed !important;
                background-repeat: no-repeat !important;
                backdrop-filter: blur(${CONFIG.blurAmount}px) !important;
                -webkit-backdrop-filter: blur(${CONFIG.blurAmount}px) !important;
                margin: 0 auto;
            }

            #content:has(.main_column > table#discog_table) .thin > center, #series .thin > center {
                order: 2;
                pointer-events: none;
                display: none;
            }

            #content {
                background-color: #2F2F2Fd1;
            }

            #menu {
                background-color: #2F2F2Fd1;
            }

            #searchbars {
                background-color: #272727d1;
            }

            #userinfo {
                background-color: #272727d1;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }

    // Replace the site logo with TV show logo from fanart.tv
    function replaceSiteLogo(logoUrl) {
        // If no logo URL provided, don't change anything
        if (!logoUrl) {
            return false;
        }

        const logoElement = document.querySelector('#logo');
        if (!logoElement) {
            console.log('BTN Fanart: Logo element not found');
            return false;
        }

        // Find or create a container for the logo
        let logoContainer = logoElement.querySelector('a');
        if (!logoContainer) {
            console.log('BTN Fanart: Logo container not found');
            return false;
        }

        // Clear existing content
        logoContainer.innerHTML = '';

        // Create a new image element for the logo
        const newLogo = document.createElement('img');
        newLogo.src = logoUrl;
        newLogo.style.maxWidth = '400px';
        newLogo.style.objectFit = 'contain';
        newLogo.style.width = 'auto';
        newLogo.style.height = 'auto';
        newLogo.style.marginBottom = '2.5rem';

        // Add the logo to the container
        logoContainer.appendChild(newLogo);

        return true; // Indicate success
    }

    // Remove initial styles and show content
    function showContent(hasLogo = false) {
        if (CONFIG.hideUntilLoaded) {
            // Fade out overlay and spinner
            const initialStyles = document.getElementById('btn-fanart-initial-styles');
            if (initialStyles) {
                // Only hide logo elements if a logo was applied
                const logoStyles = hasLogo ? `
                    #logo a::before {
                        display: none;
                    }

                    #logo a::after {
                        display: none;
                    }
                ` : `
                    #logo a::after {
                        background-color: #ffffffde;
                    }
                `;

                initialStyles.textContent = `
                    /* Remove overlay with transition */
                    html, body {
                        overflow: auto;
                    }

                    body::before {
                        opacity: 0;
                        transition: opacity 1.2s ease;
                        pointer-events: none;
                    }

                    ${logoStyles}

                    body::after {
                        opacity: 0;
                        transition: opacity 1.2s ease;
                        pointer-events: none;
                    }

                    #btn-fanart-spinner {
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

                    body::before, body::after, #btn-fanart-spinner {
                        animation: hideCompletely 0s 1.3s forwards;
                    }
                `;
            }

            // Remove spinner after transition
            setTimeout(() => {
                const spinner = document.getElementById('btn-fanart-spinner');
                if (spinner && spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
            }, 1500); // Extended to match the longer transition time
        }
    }

    // Preload an image and return a promise
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => reject(`Failed to load image: ${url}`);
            img.src = url;
        });
    }

    // Main execution
    async function init() {
        try {
            // Try to get the current URL to use as a cache key base
            const pageUrl = window.location.href;
            const cacheKeyBase = pageUrl.split('?')[0] + (pageUrl.match(/id=(\d+)/) ? pageUrl.match(/id=(\d+)/)[1] : '');

            // First, check if we have cached TVDB ID
            let tvdbId = getCachedData(`${cacheKeyBase}_tvdbId`);

            if (!tvdbId) {
                // If not cached, fetch the TVDB ID
                tvdbId = await getTvdbId();
                if (tvdbId) {
                    // Cache the TVDB ID for future use
                    setCachedData(`${cacheKeyBase}_tvdbId`, tvdbId);
                }
            }

            // Check for cached artwork data
            let artworkData = getCachedData(`${cacheKeyBase}_artwork`);

            if (!artworkData && tvdbId) {
                // If not cached, fetch the artwork data
                artworkData = await fetchArtwork(tvdbId);
                if (artworkData) {
                    // Cache the artwork data for future use
                    setCachedData(`${cacheKeyBase}_artwork`, artworkData);
                }
            }

            // Get background and logo URLs from fanart.tv
            let backgroundUrls = artworkData ? getBestBackground(artworkData) : null;
            const logoUrl = artworkData && CONFIG.replaceSiteLogo ? getBestLogo(artworkData) : null;

            // Select a random background from the available options
            let backgroundUrl = null;
            if (backgroundUrls && backgroundUrls.length > 0) {
                // Pick a random background from the available ones
                backgroundUrl = backgroundUrls[Math.floor(Math.random() * backgroundUrls.length)];
            }

            // If no background found from fanart.tv, look for background images on the page
            if (!backgroundUrl ) {
                console.log('BTN Fanart: No fanart.tv background found, checking page for images');

                // Look for Series Fan Art image
                const fanartImages = document.querySelectorAll('.body > img:nth-child(1)');
                if (fanartImages && fanartImages.length > 0) {
                    // Get the first fanart image href
                    backgroundUrl = fanartImages[0].src;
                    console.log('BTN Fanart: Found page background image:', backgroundUrl);
                }

                // If still no background found, try looking for banner images
                if (!backgroundUrl) {
                    const bannerImg = document.querySelector('#banner');
                    if (bannerImg && bannerImg.src) {
                        backgroundUrl = bannerImg.src;
                        console.log('BTN Fanart: Using banner image as background:', backgroundUrl);
                    }
                }
            }

            // Array to hold preload promises
            const preloadPromises = [];

            // Track if logo was successfully applied
            let logoApplied = false;

            // Preload background image if available
            if (backgroundUrl) {
                preloadPromises.push(
                    preloadImage(backgroundUrl)
                    .then(() => {
                        applyBackground(backgroundUrl);
                        console.log('BTN Fanart: Background applied successfully');
                    })
                    .catch(error => {
                        console.error('BTN Fanart: Failed to preload background', error);
                    })
                );
            }

            // Preload logo image if available
            if (logoUrl) {
                preloadPromises.push(
                    preloadImage(logoUrl)
                    .then(() => {
                        logoApplied = replaceSiteLogo(logoUrl);
                        console.log('BTN Fanart: Logo replaced successfully');
                    })
                    .catch(error => {
                        console.error('BTN Fanart: Failed to preload logo', error);
                    })
                );
            }

            // Wait for all preloads to complete
            await Promise.allSettled(preloadPromises);

            // Show content once everything is done
            showContent(logoApplied);

        } catch (error) {
            console.error('BTN Fanart: Error in init', error);
            showContent(); // Show content even if there's an error
        }
    }

    // Start script execution immediately
    function waitForTvdbOrBanner() {
        // Try to find TVDB link or banner immediately
        const tvdbLink = document.querySelector('a[href*="thetvdb.com"]');
        const bannerImg = document.querySelector('#banner');
        
        if (tvdbLink || bannerImg) {
            // Elements already exist, start immediately
            init();
            return;
        }
        
        // Set up mutation observer to watch for these elements
        const observer = new MutationObserver((mutations, obs) => {
            const tvdbLink = document.querySelector('a[href*="thetvdb.com"]');
            const bannerImg = document.querySelector('#banner');
            
            if (tvdbLink || bannerImg) {
                obs.disconnect(); // Stop observing once found
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
            if (!document.querySelector('a[href*="thetvdb.com"]') && !document.querySelector('#banner')) {
                console.log('BTN Fanart: Timeout waiting for TVDB link or banner, starting anyway');
                init();
            }
        }, 5000);
    }
    
    // Start immediately
    waitForTvdbOrBanner();
})();
