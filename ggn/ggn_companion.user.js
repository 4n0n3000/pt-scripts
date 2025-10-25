// ==UserScript==
// @name        GGn Companion
// @namespace    https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_companion.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_companion.user.js
// @match       https://gazellegames.net/*
// @grant       none
// @version     1.0.1
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
	backdrop-filter: blur(5px);
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
    style.textContent = css;
    document.head.appendChild(style);
}

GGn_companion();
