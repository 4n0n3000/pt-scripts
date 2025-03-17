// ==UserScript==
// @name         NFO Viewer
// @version      1.0
// @description  A Sexy NFO Viewer
// @author       BEY0NDER
// @match        https://www.scenenzb.org/uploads/*.nfo
// @match        https://www.bluraynzb.org/uploads/*.nfo
// @grant        GM.xmlHttpRequest
// @namespace    https://github.com/4n0n3000/pt-scripts
// @homepageURL  https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/multi/nfo_viewer.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/multi/nfo_viewer.user.js
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Flag to track if CSS has been injected
    let cssInjected = false;

    // Function to inject CSS into the page (only once)
    function injectCSS(css) {
        if (cssInjected) return;

        const style = document.createElement('style');
        // Removed unnecessary: style.type = 'text/css';
        style.appendChild(document.createTextNode(css));

        // If head isn't ready yet, use a MutationObserver to wait for it
        if (!document.head) {
            const observer = new MutationObserver(() => {
                if (document.head) {
                    observer.disconnect();
                    document.head.appendChild(style);
                    cssInjected = true;
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // Alternative approach - also listen for DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                if (!cssInjected && document.head) {
                    document.head.appendChild(style);
                    cssInjected = true;
                }
            });
        } else {
            document.head.appendChild(style);
            cssInjected = true;
        }
    }

    new Map();
    const workerBlob = new Blob([`
        // CP437 string map in worker
        const cp437_string = 
            '\\u0000\\u0001\\u0002\\u0003\\u0004\\u0005\\u0006\\u0007' +
            '\\b\\t\\n\\u000b\\f\\r\\u000e\\u000f' +
            '\\u0010\\u0011\\u0012\\u0013\\u0014\\u0015\\u0016\\u0017' +
            '\\u0018\\u0019\\u001a\\u001b\\u001c\\u001d\\u001e\\u001f' +
            ' !"#$%&\\'()*+,-./' +
            '0123456789:;<=>?' +
            '@ABCDEFGHIJKLMNO' +
            'PQRSTUVWXYZ[\\\\]^_' +
            '\`abcdefghijklmno' +
            'pqrstuvwxyz{|}~\\u007f' +
            '\\u00c7\\u00fc\\u00e9\\u00e2\\u00e4\\u00e0\\u00e5\\u00e7' +
            '\\u00ea\\u00eb\\u00e8\\u00ef\\u00ee\\u00ec\\u00c4\\u00c5' +
            '\\u00c9\\u00e6\\u00c6\\u00f4\\u00f6\\u00f2\\u00fb\\u00f9' +
            '\\u00ff\\u00d6\\u00dc\\u00a2\\u00a3\\u00a5\\u20a7\\u0192' +
            '\\u00e1\\u00ed\\u00f3\\u00fa\\u00f1\\u00d1\\u00aa\\u00ba' +
            '\\u00bf\\u2310\\u00ac\\u00bd\\u00bc\\u00a1\\u00ab\\u00bb' +
            '\\u2591\\u2592\\u2593\\u2502\\u2524\\u2561\\u2562\\u2556' +
            '\\u2555\\u2563\\u2551\\u2557\\u255d\\u255c\\u255b\\u2510' +
            '\\u2514\\u2534\\u252c\\u251c\\u2500\\u253c\\u255e\\u255f' +
            '\\u255a\\u2554\\u2569\\u2566\\u2560\\u2550\\u256c\\u2567' +
            '\\u2568\\u2564\\u2565\\u2559\\u2558\\u2552\\u2553\\u256b' +
            '\\u256a\\u2518\\u250c\\u2588\\u2584\\u258c\\u2590\\u2580' +
            '\\u03b1\\u00df\\u0393\\u03c0\\u03a3\\u03c3\\u00b5\\u03c4' +
            '\\u03a6\\u0398\\u03a9\\u03b4\\u221e\\u03c6\\u03b5\\u2229' +
            '\\u2261\\u00b1\\u2265\\u2264\\u2320\\u2321\\u00f7\\u2248' +
            '\\u00b0\\u2219\\u00b7\\u221a\\u207f\\u00b2\\u25a0\\u00a0';

        // URL regex in worker
        const urlRegex = /(\\b(https?|ftp|file):\\/\\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/gi;

        // Function to decode CP437 bytes in worker
        function decodeCP437(buffer) {
            const chunkSize = 8192;
            let result = '';
            
            for (let i = 0; i < buffer.length; i += chunkSize) {
                const end = Math.min(i + chunkSize, buffer.length);
                let chunk = '';
                
                for (let j = i; j < end; j++) {
                    chunk += cp437_string.charAt(buffer[j]);
                }
                
                result += chunk;
            }
            
            return result;
        }

        // Function to convert URLs to links in worker
        function convertUrlsToLinks(content) {
            return content.replace(urlRegex, url => {
                return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color: #58a6ff;">' + url + '</a>';
            });
        }

        // Handle messages from main thread
        self.onmessage = function(e) {
            const buffer = new Uint8Array(e.data.buffer);
            const decoded = decodeCP437(buffer);
            const processed = convertUrlsToLinks(decoded);
            self.postMessage({
                decoded: decoded,
                processed: processed
            });
        };
    `], { type: 'text/javascript' });

    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);

    // Main processing function
    function processNfoFile(url) {
        // Wait for DOM to be accessible
        function setupLoadingScreen() {
            // Create loading container
            const loadingContainer = document.createElement('div');
            loadingContainer.style.textAlign = 'center';
            loadingContainer.style.padding = '20px';
            loadingContainer.style.display = 'flex';
            loadingContainer.style.flexDirection = 'column';
            loadingContainer.style.justifyContent = 'center';
            loadingContainer.style.alignItems = 'center';
            loadingContainer.style.height = '100vh';

            const spinner = document.createElement('div');
            spinner.style.border = '16px solid #f3f3f3';
            spinner.style.borderTop = '16px solid #3498db';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '80px';
            spinner.style.height = '80px';
            spinner.style.animation = 'spin 2s linear infinite';
            loadingContainer.appendChild(spinner);

            const loadingText = document.createElement('div');
            loadingText.style.color = 'white';
            loadingText.style.fontSize = '18px';
            loadingText.style.marginTop = '20px';
            loadingText.textContent = 'L O A D I N G';
            loadingText.style.font = '14px "Iosevka Fixed Web", "Lucida Console", "Consolas", "DejaVu Sans Mono", "Courier New", monospace';
            loadingContainer.appendChild(loadingText);

            // Add the spinner animation style in a more cautious way
            const style = document.createElement('style');
            style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

            // Ensure document.head exists before appending to it
            if (document.head) {
                document.head.appendChild(style);
            } else {
                // If head doesn't exist yet, wait for it
                const observer = new MutationObserver(() => {
                    if (document.head) {
                        observer.disconnect();
                        document.head.appendChild(style);
                    }
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
            }

            if (document.body) {
                document.body.innerHTML = '';
                document.body.appendChild(loadingContainer);
            } else {
                // If body doesn't exist yet, wait for it
                const observer = new MutationObserver(() => {
                    if (document.body) {
                        observer.disconnect();
                        document.body.innerHTML = '';
                        document.body.appendChild(loadingContainer);
                    }
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
            }
        }

        // Add a DOMContentLoaded listener to ensure we have the DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupLoadingScreen);
        } else {
            setupLoadingScreen();
        }

        // Request the NFO file
        GM.xmlHttpRequest({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            onload: function (response) {
                // Use worker for heavy processing
                worker.postMessage({
                    buffer: response.response
                });
            },
            onerror: function () {
                if (document.body) {
                    document.body.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">Error loading NFO file</div>';
                }
            }
        });
    }

    // Handle worker response
    worker.onmessage = function(e) {
        // Create content container
        const contentFragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.className = 'nfo-container';

        // Create pre element for NFO content
        const pre = document.createElement('pre');
        pre.className = 'nfo-content';
        pre.innerHTML = e.data.processed;

        container.appendChild(pre);
        contentFragment.appendChild(container);

        // Replace document content with NFO
        document.body.innerHTML = '';
        document.body.appendChild(contentFragment);
    };

    // Inject the CSS styles
    injectCSS(`
        body {
            background: url(https://www.scenenzb.org/pic/newtheme/bg_body.png); !important;
            color: #fff !important;
            margin: 0 !important;
            padding: 10px !important;
            display: flex !important;
            justify-content: center !important;
        }
        @font-face {
            font-family: "Iosevka Fixed Web";
            src: url("https://raw.githubusercontent.com/be5invis/Iosevka/v21.0.0/ttf/iosevka-fixed-regular.ttf") format("truetype");
            font-display: swap;
        }
        .nfo-container {
            max-width: 100%;
            overflow-x: auto;
            margin: 0 auto;
        }
        .nfo-content {
            font-family: "Iosevka Fixed Web", "Lucida Console", "Consolas", "DejaVu Sans Mono", "Courier New", monospace !important;
            font-size: 14px !important;
            white-space: pre !important;
            line-height: 1 !important;
            display: inline-block !important;
            text-align: left !important;
            letter-spacing: -0.4px !important;
            text-shadow: 0px 0px 3px #ffffffc7 !important;
            padding: 20px;
        }
        @media (max-width: 625px) {
            .nfo-content {
                font-size: 2.1vw !important;
            }
        }
    `);

    // Initialize the NFO viewer
    processNfoFile(window.location.href);

    // Clean up worker when page unloads
    window.addEventListener('unload', () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
    });
})();