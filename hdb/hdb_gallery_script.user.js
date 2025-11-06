// ==UserScript==
// @name         HDB Torrent Gallery - Tokyo Night Dark
// @namespace    https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/HDB/hdb_gallery_script.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/HDB/hdb_gallery_script.js
// @version      1.0.1
// @description  HDB Torrent Gallery Script for Tokyo Night Dark theme. Work In Progress...
// @include      https://hdbits.org/browse.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @connect      hdbits.org
// @run-at       document-end
// @author       BEY0NDER
// @icon	     https://hdbits.org/favicon.ico
// ==/UserScript==

// TODO:
// - Add theme support for Tokyo Night
// - Add theme support for Tokyo Night Light
// - Add more customization options

// ========================================
// Constants
// ========================================
const STORAGE_KEY_GALLERY_VIEW = 'galleryView';
const CACHE_KEY_PREFIX = 'HDB.cover:';
const CONFIG_ID = 'HDB_Gallery_Config';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_EXPIRY_DAYS = 7;
const DEFAULT_BLUR_AMOUNT = 18;
const DEFAULT_CARDS_PER_ROW = '5';
const DEFAULT_MAX_WIDTH = 80;

const CARD_LAYOUT_CONFIGS = {
    '5': { width: '220px', fontSize: '10pt', fontMinus: '1pt', fontPlus: '1pt', imgWidth: '28px', imgHeight: '28px' },
};

const MAX_WIDTH_CONFIGS = {
    '50': { width: '50%' },
    '60': { width: '60%' },
    '70': { width: '70%' },
    '80': { width: '80%' },
    '90': { width: '90%' },
    '100': { width: '100%' },
};

const CATEGORY_TYPES = {
    OST: 'cats_ost',
    APPLICATIONS: 'cats_applications',
    EBOOKS: 'cats_ebooks'
};

const DOM_SELECTORS = {
    TORRENT_LINK: ".fl",
    ALBUM_ART: '.browse_imdb_poster > img',
    TORRENT_TABLE: '#torrent-list > tbody',
    // Target rows with id starting with 't' followed by digits (e.g., id="t547653")
    GROUP_ID: '[id^="t"]:not([id="t"]):not([id="tabs"]):not([id="toCal"]):not([id="tags"]):not([id="torrent-list"])'
};

const CONTENT_CHILD_INDICES = {
    GALLERY_INSERT_POSITION: 3,
    TORRENT_LIST_POSITION: 3,
    ORIGINAL_TABLE_POSITION: 4
};

// ========================================
// Data Models
// ========================================
class Torrent {
    constructor(link, name, category, codec, medium, imdbRating, featured, newtag, internal, exclusive, genres, when, size, downloadLink, rssAdd, bookmarkAdd, wishlistAdd, rssAddId, img, seeds, snatched, leechers, freeleech) {
        this.link = link;
        this.name = name;
        this.img = '';
        this.category = category;
        this.codec = codec;
        this.medium = medium;
        this.imdbRating = imdbRating;
        this.featured = featured;
        this.newtag = newtag;
        this.internal = internal;
        this.exclusive = exclusive;
        this.genres = genres;
        this.when = when;
        this.size = size;
        this.downloadLink = downloadLink;
        this.rssAdd = rssAdd;
        this.bookmarkAdd = bookmarkAdd;
        this.wishlistAdd = wishlistAdd;
        this.rssAddId = rssAddId;
        this.img = img;
        this.seeds = seeds;
        this.snatched = snatched;
        this.leechers = leechers;
        this.freeleech = freeleech || null;
    }
}

// ========================================
// State Management
// ========================================
const state = {
    groups: [],
    showGallery: localStorage.getItem(STORAGE_KEY_GALLERY_VIEW) !== 'false',
    isAlternativePage: isAlternativePageLayout(),
    configSaved: false
};

function isAlternativePageLayout() {
    const url = window.location.href;
    return url.includes('&type=') || url.includes('?type=');
}

// ========================================
// Initialization
// ========================================
function init() {
    initConfig();
    initTorrentInfo();
    initGallery();
    initGroups();
    initImages();
    applyGalleryState();
}

// ========================================
// Gallery State Management
// ========================================
function applyGalleryState() {
    const collage = document.getElementById('collageBody');
    if (!collage) return;
    
    const displayValue = state.showGallery ? '' : 'none';
    const inverseDisplayValue = state.showGallery ? 'none' : '';
    
    collage.style.display = displayValue;
    // toggleOriginalTable(inverseDisplayValue);
}

// function toggleOriginalTable(displayValue) {
//     try {
//         const contentIndex = state.isAlternativePage ? 0 : 1;
//         const content = document.getElementById('content');
//         const original = content?.children[contentIndex]?.children[CONTENT_CHILD_INDICES.ORIGINAL_TABLE_POSITION]?.children[0];
        
//         if (original) {
//             original.style.display = displayValue;
//         }
//     } catch (e) {
//         const table = document.querySelector(DOM_SELECTORS.TORRENT_TABLE);
//         if (table) {
//             table.style.display = displayValue;
//         }
//     }
// }

function toggleGallery() {
    state.showGallery = !state.showGallery;
    localStorage.setItem(STORAGE_KEY_GALLERY_VIEW, state.showGallery);
    applyGalleryState();
}

// ========================================
// Configuration Management
// ========================================
function initConfig() {
    try {
        GM_config.init({
            id: 'HDB_Gallery_Config',
            title: `
                <div>
                    <div style="user-select: none; font-family: 'Bebas Neue', Helvetica, Tahoma, Geneva, sans-serif; background-color: #fff; -webkit-background-clip: text; -webkit-text-fill-color: transparent; -webkit-filter: brightness(110%); filter: brightness(110%); transition: all 0.3s; font-weight: bold; padding-top: 3%;">
                        HDB Gallery Settings<br>
                    </div>
                    <div style="margin-top:15px"><small style="font-weight: 300; color: #95a5a6; display: block; font-size: 0.6rem; margin-top: 5px;"><i>Hover over settings marked with * to see more information</i></small></div>
                </div>
            `,
            fields: {
                enableFooter: { label: 'Enable Footer Details', type: 'checkbox', default: true, title: 'Toggle footer details for more group info' },
                maxWidth: { label: 'Max Width (%)', type: 'select', options: ['50','60','70','80','90','100'], default: '80', title: 'Maximum width of the gallery' },
                cacheExpiryDays: { label: 'Cache Expiry (days)', type: 'int', default: 7, title: 'Number of days to cache cover image URLs' },
                blurAmount: { label: 'Background Blur Amount (px) *', type: 'int', default: 18, title: 'Amount of blur applied to the background fill behind cover images' },
            },
            events: {
                open: function(doc){
                    let style = this.frame.style;
                    style.width = '420px';
                    style.height = '410px';
                    style.inset = '';
                    style.top = '4%';
                    style.right = '6%';
                    style.borderRadius = '5px';
                    style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.1)';

                    state.configSaved = false;

                    const versionEl = document.createElement('span');
                    versionEl.classList = 'version_label reset';
                    const version = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version)
                        ? GM_info.script.version
                        : ((typeof GM !== 'undefined' && GM.info && GM.info.script && GM.info.script.version) ? GM.info.script.version : '');
                    versionEl.textContent = `version ${version}`;
                    const btnHolder = doc.getElementById('HDB_Gallery_Config_buttons_holder');
                    if (btnHolder) btnHolder.appendChild(versionEl);

                    const saveButton = doc.getElementById('HDB_Gallery_Config_saveBtn');
                    if (saveButton) {
                        saveButton.addEventListener('click', () => {
                            saveButton.classList.add('success');
                            setTimeout(() => saveButton.classList.remove('success'), 500);
                        });
                    }

                    const checkboxSections = [ 'enableFooter' ];
                    checkboxSections.forEach(field => {
                        const el = doc.getElementById(`HDB_Gallery_Config_${field}_var`);
                        if (el) el.classList.add('checkbox-section');
                    });

                    const sliderSections1 = [ 'blurAmount' ];
                    sliderSections1.forEach(field => {
                        const el = doc.getElementById(`HDB_Gallery_Config_${field}_var`);
                        if (el) el.classList.add('slider-section');
                    });

                    const selectSections = [ 'maxWidth' ];
                    selectSections.forEach(field => {
                        const el = doc.getElementById(`HDB_Gallery_Config_${field}_var`);
                        if (el) el.classList.add('slider-section');
                    });
                },
                save: function() {
                    state.configSaved = true;
                    try { clearCoverCache(); } catch(e) {}
                    try { applyConfigStyles(); } catch(e) {}
                },
                close: function() {
                    if (state.configSaved) {
                        reloadPageSafely(this.frame);
                    }
                }
            },
            css: `
                #HDB_Gallery_Config { background: hsl(230, 10%, 9%); margin: 0; padding: 10px 20px; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                #HDB_Gallery_Config .config_header { color: #fff; padding-bottom: 10px; font-weight: 100; justify-content: center; align-items: center; text-align: center; border-bottom: none; background: transparent; margin: 0; }
                #HDB_Gallery_Config .config_var { display: flex; flex-direction: row; text-align: left; justify-content: space-between; align-items: center; width: 90%; margin-left: 26px; padding: 4px 0; border-bottom: 1px solid #7470703d; margin-top: 5px; margin-bottom: 5px; }
                #HDB_Gallery_Config .field_label { color: #fff; width: 45%; user-select: none; font-weight: 500; }
                #HDB_Gallery_Config .field_label.disabled { color: #B0BEC5; }
                #HDB_Gallery_Config input[type="text"],
                #HDB_Gallery_Config input[type="number"],
                #HDB_Gallery_Config select { background: rgba(255,255,255,0.9); border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box; font-size: 0.9em; padding: 8px; width: 55%; transition: all 0.3s ease; }
                #HDB_Gallery_Config input[type="text"]:focus,
                #HDB_Gallery_Config input[type="number"]:focus,
                #HDB_Gallery_Config select:focus { border-color: #2C3E50; box-shadow: 0 0 5px hsl(212, 100%, 65%); outline: none; }
                #HDB_Gallery_Config input[type="checkbox"] { cursor: pointer; margin-right: 4px !important; width: 16px; height: 16px; }
                #HDB_Gallery_Config .reset { color: #95a5a6; text-decoration: none; user-select: none; }
                #HDB_Gallery_Config_buttons_holder { display: grid; column-gap: 20px; row-gap: 16px; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; width: 90%; margin-left: 26px; height: 94px; text-align: center; align-items: center; margin-top: 20px; }
                #HDB_Gallery_Config .reset_holder { grid-column: 3; grid-row: 2; }
                #HDB_Gallery_Config .version_label { grid-column: 1; grid-row: 2; text-align: left !important; }
                #HDB_Gallery_Config_resetLink { text-transform: lowercase; background: transparent; color: #95a5a6; }
                #HDB_Gallery_Config .version_label:hover,
                #HDB_Gallery_Config_resetLink:hover { text-decoration: underline; }
                #HDB_Gallery_Config .saveclose_buttons { margin: 22px 0px 4px; }
                #HDB_Gallery_Config_saveBtn { grid-column: 2; grid-row: 1; background-color: hsl(230, 10%, 15%); color: #FFFFFF; border: none; border-radius: 5px; padding: 15px 20px; font-size: 1rem; font-weight: 500; cursor: pointer; will-change: background-color, transform; transition: background-color 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.2); padding-top: 6px !important; padding-bottom: 6px !important; }
                #HDB_Gallery_Config_saveBtn:hover { background-color: hsl(212, 100%, 70%); transform: translateY(-2px); }
                #HDB_Gallery_Config_saveBtn:active { background-color: hsl(212, 100%, 70%); transform: translateY(1px); }
                #HDB_Gallery_Config_saveBtn.success { box-shadow: 0 0 6px 3px hsl(212, 100%, 70%); }
                #HDB_Gallery_Config_closeBtn { grid-column: 3; grid-row: 1; background-color: hsl(230, 10%, 15%); color: #FFFFFF; border: none; border-radius: 5px; padding: 15px 20px; font-size: 1rem; font-weight: 500; cursor: pointer; will-change: background-color, transform; transition: background-color 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.2); padding-top: 6px !important; padding-bottom: 6px !important; }
                #HDB_Gallery_Config_closeBtn:hover { background-color: hsl(212, 100%, 70%); transform: translateY(-2px); }
                #HDB_Gallery_Config_closeBtn:active { background-color: hsl(212, 100%, 70%); transform: translateY(1px); }
                /* Tooltip styling */
                #HDB_Gallery_Config .field_label[title]:hover::after { content: attr(title); position: absolute; background: #2C3E50; color: white; padding: 5px 10px; border-radius: 3px; font-size: 0.8em; max-width: 300px; z-index: 100; margin-top: 25px; left: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                /* Animations */
                @keyframes pulse { 0%,100%{box-shadow:0 0 6px 2px rgba(255,128,0,0.5);} 50%{box-shadow:0 0 10px 4px #86d406;} }
            `
        });

        try { if (GM_config && typeof GM_config.onSave !== 'undefined') { GM_config.onSave = applyConfigStyles; } } catch(e) {}

        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('HDB Gallery: Settings', function(){ GM_config.open(); });
            GM_registerMenuCommand('HDB Gallery: Clear Cover Cache', clearCoverCache);
        }

        applyConfigStyles();
    } catch(e) {
        console.warn('[HDB Gallery] GM_config init failed', e);
    }
}

function reloadPageSafely(frame) {
    if (frame) {
        window.location.reload();
    } else {
        setTimeout(() => window.location.reload(), 250);
    }
}

function getConfigValue(key, defaultValue) {
    return (GM_config && GM_config.get) ? GM_config.get(key) : defaultValue;
}

function applyConfigStyles() {
    try {
        applyFooterVisibility();
        applyBlurAmount();
        applyMaxWidth();
        applyCardLayout();
    } catch (e) {
        console.warn('[HDB Gallery] Failed to apply config styles', e);
    }
}

function applyFooterVisibility() {
    const footerEnabled = getConfigValue('enableFooter', true);
    const displayValue = footerEnabled ? 'block' : 'none';
    document.documentElement.style.setProperty('--footer-details', displayValue);
}

function applyBlurAmount() {
    const blurAmount = getConfigValue('blurAmount', DEFAULT_BLUR_AMOUNT);
    document.documentElement.style.setProperty('--HDB-blur', `${blurAmount}px`);
}

function applyMaxWidth() {
    const maxWidth = getConfigValue('maxWidth', '80');
    const config = MAX_WIDTH_CONFIGS[maxWidth];
    if (!config) return;
    document.documentElement.style.setProperty('--max-gallery-width', config.width);
}

function applyCardLayout() {
    const cardsPerRow = getConfigValue(DEFAULT_CARDS_PER_ROW);
    const config = CARD_LAYOUT_CONFIGS[cardsPerRow];
    
    if (!config) return;
    
    document.documentElement.style.setProperty('--HDB-width', config.width);
    document.documentElement.style.setProperty('--HDB-cards-per-row', cardsPerRow);
    document.documentElement.style.setProperty('--footer-font-size', config.fontSize);
    document.documentElement.style.setProperty('--footer-font-minus', config.fontMinus);
    document.documentElement.style.setProperty('--footer-font-plus', config.fontPlus);
    document.documentElement.style.setProperty('--platform-img-width', config.imgWidth);
    document.documentElement.style.setProperty('--platform-img-height', config.imgHeight);
}

// ========================================
// Cache Management
// ========================================
function getCacheExpiryMs() {
    try {
        const days = getConfigValue('cacheExpiryDays', DEFAULT_CACHE_EXPIRY_DAYS);
        return days * MILLISECONDS_PER_DAY;
    } catch (e) {
        return DEFAULT_CACHE_EXPIRY_DAYS * MILLISECONDS_PER_DAY;
    }
}

function getCachedData(key) {
    try {
        const raw = GM_getValue(key, null);
        if (!raw) return null;
        
        const parsed = JSON.parse(raw);
        if (!isValidCacheEntry(parsed)) return null;
        
        if (isCacheExpired(parsed.timestamp)) {
            GM_setValue(key, null);
            return null;
        }
        
        return parsed.data;
    } catch (e) {
        return null;
    }
}

function isValidCacheEntry(entry) {
    return entry && typeof entry === 'object' && entry.timestamp;
}

function isCacheExpired(timestamp) {
    return (Date.now() - timestamp) > getCacheExpiryMs();
}

function setCachedData(key, data) {
    try {
        const cacheEntry = {
            timestamp: Date.now(),
            data
        };
        GM_setValue(key, JSON.stringify(cacheEntry));
    } catch (e) {
        console.warn('[HDB Gallery] Failed to cache data', e);
    }
}

function clearCoverCache() {
    try {
        const keys = (typeof GM_listValues === 'function') ? GM_listValues() : [];
        const clearedCount = clearCoverCacheKeys(keys);
        alert(`HDB Gallery: Cleared ${clearedCount} cached covers`);
    } catch (e) {
        alert('HDB Gallery: Failed to clear cache');
    }
}

function clearCoverCacheKeys(keys) {
    let cleared = 0;
    for (const key of keys) {
        if (isCoverCacheKey(key)) {
            GM_setValue(key, null);
            cleared++;
        }
    }
    return cleared;
}

function isCoverCacheKey(key) {
    return key && key.startsWith(CACHE_KEY_PREFIX);
}

function getCachedCover(link) {
    return getCachedData(`${CACHE_KEY_PREFIX}${link}`);
}

function setCachedCover(link, url) {
    setCachedData(`${CACHE_KEY_PREFIX}${link}`, url);
}

// ========================================
// Cover Image Management
// ========================================
function applyCoverToIndex(index, url) {
    const collage = document.getElementById('collageBody');
    if (!collage) return;
    
    const card = collage.children[index];
    if (!card) return;
    
    const img = card.getElementsByTagName('img')[0];
    const bg = card.querySelector('.coverBg');
    
    if (url) {
        updateCardWithCover(img, bg, url, index);
    } else {
        markImageAsUnavailable(img);
    }
}

function updateCardWithCover(img, bg, url, index) {
    img.src = url;
    if (bg) {
        bg.style.backgroundImage = `url('${escapeSingleQuotes(url)}')`;
    }
    if (state.groups[index]) {
        state.groups[index].img = url;
    }
}

function escapeSingleQuotes(str) {
    return str.replace(/'/g, "\\'");
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function markImageAsUnavailable(img) {
    if (img) {
        img.classList.add('no-image');
    }
}

function initImages() {
    const albumArts = document.querySelectorAll(DOM_SELECTORS.ALBUM_ART);
    albumArts.forEach((item, index) => {
        const torrentLink = state.groups[index]?.link;
        if (!torrentLink) return;
        
        // Check cache first
        const cachedCover = getCachedCover(torrentLink);
        if (cachedCover) {
            applyCoverToIndex(index, cachedCover);
            return;
        }
        
        // Get cover URL from page
        const coverUrl = item.src;
        if (coverUrl) {
            // Store in cache
            setCachedCover(torrentLink, coverUrl);
            applyCoverToIndex(index, coverUrl);
        }
    });
}


// ========================================
// Gallery UI Creation
// ========================================
function initGallery() {
    const gallery = createGalleryContainer();
    insertGalleryIntoPage(gallery);
    injectGalleryStyles();
    attachGalleryEventListeners();
}

function createGalleryContainer() {
    const gallery = createElement('div', { id: 'gallery_view' });
    const galleryInfo = createGalleryInfo();
    const collage = createElement('div', { id: 'collageBody' });
    
    gallery.append(galleryInfo, collage);
    return gallery;
}

function createGalleryInfo() {
    const galleryInfo = createElement('div', { id: 'gallery_info' });
    const galleryTitle = createElement('strong', { innerHTML: 'Gallery' });
    const galleryToggle = createElement('a', {
        id: 'galleryToggle',
        innerHTML: '[Toggle]',
        style: 'float:right; margin-left:5px'
    });
    
    galleryInfo.append(galleryTitle, galleryToggle);
    return galleryInfo;
}

function createElement(tag, attributes = {}) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style') {
            element.style.cssText = value;
        } else {
            element[key] = value;
        }
    });
    return element;
}

function insertGalleryIntoPage(gallery) {
    const content = document.getElementById('resultsarea');
    content.insertBefore(gallery, content.children[3]);
}

function attachGalleryEventListeners() {
    const toggleButton = document.getElementById('galleryToggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleGallery);
    }
}

function injectGalleryStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      :root{--HDB-card-bg:#0d0e11;--HDB-card-bg2:#16171d;--HDB-text:#e6f1f7;--HDB-muted:#97a8b6;--HDB-overlay:rgba(0,0,0,0.35);--footer-details:block;--HDB-width:220px;--HDB-cards-per-row:5;}
	  #gallery_view { background: var(--mantle); padding: 8px; border: var(--table-border); border-radius: var(--main-br); display: grid; max-width: var(--max-gallery-width, 100%); }
	  #gallery_info{display:flex;align-items:center;justify-content:space-between;color:var(--HDB-text)}
	  #galleryToggle{float:right;margin-left:5px;color:var(--HDB-text);text-decoration:none;cursor:pointer}
	  #galleryToggle:hover{text-decoration:underline}
	  #collageBody{position:relative;display:grid;grid-template-columns:repeat(var(--HDB-cards-per-row, 5), minmax(0, 1fr));gap:10px;float:inline-start;margin-top:10px;background:rgb(22, 23, 29);padding:8px;border-radius:6px;width:-moz-available;}
      .groupWrapper{height:auto;box-sizing:border-box;overflow:hidden;background:var(--mantle);border-radius:var(--main-br);border:var(--table-border);box-shadow:0 1px 2px rgba(0,0,0,0.3);transition:scale .5s ease, box-shadow .15s ease;position:relative;display:flex;flex-direction:column}
	  .groupWrapper:hover{scale:100%;box-shadow:0px 0px 10px rgba(102, 173, 255, 0.66)}
      .releaseMedia{position:static;display:flex;align-items:center;justify-content:center;aspect-ratio:3/4;flex:1 0 auto}
	  .coverBg{position:absolute;inset:0;background-position:center;background-repeat:no-repeat;background-size:cover;filter:blur(var(--HDB-blur, 18px)) saturate(110%) brightness(80%);transform:scale(1)}
	  .coverBg::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.25))}
	  .coverImage{display:block;position:relative;max-width:100%;max-height:100%;width:100%;height:auto;object-fit:contain;margin:auto;border-radius:5px}
	  .releaseTitle{text-align:center;font-size:10pt;display:block;padding:5px;overflow:hidden;line-height:1.3;white-space:nowrap;text-overflow:ellipsis;color:var(--HDB-text);background:var(--mantle);position:relative;z-index:1}
      .releaseFooter{text-align:center;font-size:10pt;display:var(--footer-details);padding:10px;overflow:hidden;line-height:1.3;white-space:nowrap;text-overflow:ellipsis;color:var(--HDB-text);background:var(--mantle);position:relative;z-index:1;font-weight:bold;margin-top:auto;}
      .footerTable{width:100%;height:100%;border-collapse:collapse;table-layout:fixed;}
      .footerTable td{padding:4px 6px;vertical-align:middle;text-align:center;}
      .footerMetaRow{color:var(--yellow);font-variant:small-caps;font-size:var(--font-size-tag);text-transform:lowercase;}
      .footerMetaRow span{display:block;}
      .footerGenresCell{color:#66707f;font-weight:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(var(--footer-font-size) - var(--footer-font-minus));}
      .footerStatsRow{color:var(--yellow);font-variant:small-caps;font-size:var(--font-size-tag);text-transform:lowercase;}
      .footerStatsRow span{display:block;}
      .footerStatsValue{font-size:calc(var(--footer-font-size) + var(--footer-font-plus));font-variant:initial;color:var(--HDB-text);font-weight:bold;}
      .footerActionsCell{padding-top:10px;}
      .footerActions{display:flex;justify-content:space-evenly;align-items:center;gap:12px;}
      .hiddenType{color:#525252 !important;text-decoration:line-through}
      #resultsarea { width: -moz-available !important; width: -webkit-fill-available !important; width: fill-available !important; }
      .no-image { background-image: url(https://theposterdb.com/images/defaults/missing_poster.jpg); background-size: cover; background-position: center; background-repeat: no-repeat; width: 100%; height: 100%; }
      .category1, .category2, .category3, .category4, .category5, .category6, .category7, .category8 { width: 42px; height: 42px; background: linear-gradient(to bottom, rgb(146, 158, 234), rgb(128, 191, 255)); mask-size: 30px !important; }
      p:has(a[href*="page="]):not(.sub) { margin-bottom: 1rem !important; }
      .bottom:not([id]) { max-width: var(--max-gallery-width); }
      
      /* Featured badge pseudo-elements */
      [id^="featured"]:has([class^="featured"])::before,
      [id^="featured"]:has([class^="featured"])::after {
        box-sizing: content-box;
        display: flex;
        z-index: 2;
        align-items: center;
        justify-content: center;
        width: 55px;
        height: 21px;
        font-variant: small-caps;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
      }
      
      [id^="featured"]:has([class^="featured"])::before {
        border: 1px solid rgba(255, 221, 118, 0.5);
        background-color: hsla(45, 100%, 73%, 0.1);
        content: "Featured";
        color: hsl(45.1, 100%, 73.1%);
        font-variant: all-small-caps;
        border-radius: var(--small-br) var(--small-br) 0 0;
        font-size: 0.75rem;
      }
      
      #featured1:has([class^="featured"])::after {
        border: var(--general-border);
        background-color: var(--crust);
        content: "Free";
        color: #ff4b4b;
        border-top: 0 !important;
        border-radius: 0 0 var(--small-br) var(--small-br);
        font-size: 0.6875rem;
      }
      
      /* Freeleech badge pseudo-elements */
      [id^="freeleech"]:has([class^="freeleech"])::before,
      [id^="freeleech"]:has([class^="freeleech"])::after {
        box-sizing: content-box;
        display: flex;
        z-index: 2;
        align-items: center;
        justify-content: center;
        width: 55px;
        height: 21px;
        font-variant: small-caps;
        font-weight: 500;
        text-transform: uppercase;
        white-space: nowrap;
      }
      
      [id^="freeleech"]:has([class^="freeleech"])::before {
        border-radius: var(--small-br);
        font-size: 0.75rem;
      }
      
      [id^="freeleech"]:has([class^="freeleech"])::after {
        border-top: 0 !important;
        border-radius: 0 0 var(--small-br) var(--small-br);
        font-size: 0.6875rem;
      }
      
      /* 100% Freeleech */
      #freeleech100:has([class^="freeleech"])::before {
        border: 1px solid rgba(0, 255, 0, 0.5);
        background-color: hsla(120, 100%, 25%, 0.3);
        content: "100% FL";
        color: #00ff00;
      }
      
      /* 50% Freeleech */
      #freeleech50:has([class^="freeleech"])::before {
        border: 1px solid rgba(255, 165, 0, 0.5);
        background-color: hsla(39, 100%, 25%, 0.3);
        content: "50% FL";
        color: #ffa500;
      }
      
      /* 25% Freeleech */
      #freeleech25:has([class^="freeleech"])::before {
        border: 1px solid rgba(255, 255, 0, 0.5);
        background-color: hsla(60, 100%, 25%, 0.3);
        content: "25% FL";
        color: #ffff00;
      }
      
      /* Neutral Leech */
      #freeleechNeutral:has([class^="freeleech"])::before {
        border: 1px solid rgba(135, 206, 235, 0.5);
        background-color: hsla(197, 71%, 37%, 0.3);
        content: "Neutral";
        color: #87ceeb;
      }
      
      /* Responsive columns */
      @media (max-width: 1400px) {
        #collageBody { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 1000px) {
        #collageBody { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
      }
      `;
    document.head.append(style);
}

// ========================================
// Group Card Rendering
// ========================================
function initGroups() {
    const collage = document.getElementById('collageBody');
    if (!collage) return;
    
    collage.innerHTML = '';
    state.groups.forEach((group, index) => {
        const card = createGroupCard(group, index);
        collage.append(card);
    });
    normalizeFooterHeights();
}

function normalizeFooterHeights() {
    const footers = document.querySelectorAll('.groupWrapper .releaseFooter');
    let maxHeight = 0;

    footers.forEach(footer => {
        footer.style.minHeight = '';
        const { offsetHeight } = footer;
        if (offsetHeight > maxHeight) {
            maxHeight = offsetHeight;
        }
    });

    footers.forEach(footer => {
        footer.style.minHeight = maxHeight ? `${maxHeight}px` : '';
    });
}

function createGroupCard(group) {
    const groupWrapper = createElement('div', { className: 'groupWrapper' });
    const releaseTitle = createReleaseTitle(group);
    const releaseMedia = createReleaseMedia(group);
    const releaseFooter = createReleaseFooter(group);
    
    groupWrapper.append(releaseTitle, releaseMedia, releaseFooter);
    return groupWrapper;
}

function createReleaseTitle(group) {
    const releaseTitle = createElement('div', { className: 'releaseTitle' });
    releaseTitle.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <a href="${group.link}" style="overflow:hidden;text-overflow:ellipsis;padding-left:6px;padding-right:6px;width:100%; cursor: pointer;" title="${group.name.replace(/"/g, '&quot;')}">${group.name}</a>            
        </div>
        <div style="padding: 5px 0 5px 0;">
            ${group.newtag ? '<span class="tag new">new</span>' : ''} ${group.internal ? '<span class="tag internal">internal</span>' : ''} ${group.exclusive ? '<span class="tag exclusive">exclusive</span>' : ''}
        </div>
        `;
        
    return releaseTitle;
}

function createReleaseMedia(group) {
    const releaseMedia = createElement('div', { className: 'releaseMedia' });
    const codec = createElement('span', { id: group.codec, innerHTML: `<div class="${group.medium}"></div>` });
    const featured = createElement('span', { innerHTML: `<div class="featured"></div>` });
    const freeleech = createElement('span', { innerHTML: `<div class="freeleech"></div>` });
    const category = createElement('span', { innerHTML: `<div class="${group.category}"></div>` });
    
    // Add "Featured" badge when group.featured is true
    if (group.featured) {
        featured.id = 'featured1';
        featured.style.cssText = `
            position: absolute;
            top: 60px;
            background-color: black;
            border-radius: var(--small-br) var(--small-br);
            opacity: 0.9;
        `;
    }
    
    // Add "Freeleech" badge when group.freeleech is present
    if (group.freeleech && !group.featured) {
        const freeleechType = group.freeleech === '100%' ? 'freeleech100' : 
                             group.freeleech === '50%' ? 'freeleech50' :
                             group.freeleech === '25%' ? 'freeleech25' :
                             group.freeleech === 'Neutral' ? 'freeleechNeutral' : 'freeleech100';
        freeleech.id = freeleechType;
        freeleech.style.cssText = `
            position: absolute;
            top: 60px;
            background-color: black;
            border-radius: var(--small-br);
            opacity: 0.9;
        `;
    }
    
    category.style.cssText = `
        position: absolute;
        top: 60px;
        right: 0px;
    `;
    codec.style.cssText = `
        position: absolute;
        top: 60px;
        left: 5px;
        background-color: black;
        border-radius: var(--small-br) var(--small-br);
        opacity: 90%;
    `;
    if (group.img) {
        const coverBg = createElement('div', { className: 'coverBg' });
        coverBg.style.cssText = `
            background-image: url('${escapeSingleQuotes(group.img)}');
        `;
        const image = createCoverImage(group.img);
        const imageLink = createElement('a', { href: group.link });
        imageLink.append(image);
        
        // Append elements based on what badges are present
        const elements = [coverBg, imageLink, codec, category];
        if (group.featured) elements.push(featured);
        if (group.freeleech) elements.push(freeleech);
        releaseMedia.append(...elements);
    } else {
        releaseMedia.append(createElement('div', { className: 'no-image' }), codec, category);
    }
    
    return releaseMedia;
}

function createCoverImage(img) {
    const image = createElement('img', {
        className: 'coverImage',
        alt: 'Cover Image',
        src: img ? img : ''
    });
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.classList.add('no-image'));
    return image;
}

function toLineArray(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => (typeof item === 'string' ? item.trim() : String(item)))
            .filter(line => line.length > 0);
    }

    if (value === null || value === undefined) {
        return [];
    }

    const stringValue = typeof value === 'string' ? value : String(value);
    if (/<br\s*\/?>(?:\s*)/i.test(stringValue)) {
        return stringValue
            .split(/<br\s*\/?>(?:\s*)/i)
            .map(part => part.replace(/<[^>]+>/g, '').trim())
            .filter(part => part.length > 0);
    }

    const trimmed = stringValue.trim();
    return trimmed ? [trimmed] : [];
}

function formatFooterCell(value) {
    if (value === undefined || value === null || value === '') {
        return '&nbsp;';
    }
    return escapeHtml(value);
}

function buildFooterMetaRows(imdbValue, sizeValue, whenValue) {
    const imdbLines = toLineArray(imdbValue);
    const sizeLines = toLineArray(sizeValue);
    const whenLines = toLineArray(whenValue);
    const rowCount = Math.max(imdbLines.length, sizeLines.length, whenLines.length, 1);

    let rows = '';
    for (let i = 0; i < rowCount; i++) {
        const imdbCell = formatFooterCell(imdbLines[i]);
        const sizeCell = formatFooterCell(sizeLines[i]);
        const whenCell = formatFooterCell(whenLines[i]);
        rows += `
                <tr class="footerMetaRow">
                    <td><span>${imdbCell}</span></td>
                    <td><span>${sizeCell}</span></td>
                    <td><span>${whenCell}</span></td>
                </tr>`;
    }

    return rows.trim();
}

function createReleaseFooter(group) {
    const releaseFooter = createElement('div', { className: 'releaseFooter' });
    const genresText = group.genres ? group.genres : '-';
    const genresTitle = escapeHtml(genresText);
    const metaRows = buildFooterMetaRows(group.imdbRating, group.size, group.when);
    const genresDisplay = escapeHtml(genresText);
    releaseFooter.innerHTML = `
        <table class="footerTable">
            <tbody>
                ${metaRows}
                <tr>
                    <td class="footerGenresCell" colspan="3" title="${genresTitle}">${genresDisplay}</td>
                </tr>
                <tr class="footerStatsRow">
                    <td>
                        <span class="footerStatsLabel">Snatched</span>
                        <span class="footerStatsValue">${group.snatched}</span>
                    </td>
                    <td>
                        <span class="footerStatsLabel">Seeders</span>
                        <span class="footerStatsValue">${group.seeds}</span>
                    </td>
                    <td>
                        <span class="footerStatsLabel">Leechers</span>
                        <span class="footerStatsValue">${group.leechers}</span>
                    </td>
                </tr>
                <tr>
                    <td class="footerActionsCell" colspan="3">
                        <div class="footerActions">
                            <a class="js-download" href="${group.downloadLink}"></a>
                            <a id="${group.rssAddId}" class="js-rssadd" href="${group.rssAdd}"></a>
                            <a class="js-bookmarkadd" href="${group.bookmarkAdd}"></a>
                            <a class="js-wishlistadd" href="${group.wishlistAdd}"></a>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>`;
    return releaseFooter;
}

function formatRatingDisplay(rating) {
    if (rating === 'N/A' || rating === '') {
        return { text: '', style: '' };
    }
    
    const numericRating = parseFloat(rating);
    if (isNaN(numericRating)) {
        return { text: rating, style: '' };
    }
    
    if (numericRating < 0) {
        return {
            text: rating,
            style: 'color: var(--downVote);font-family:mario;font-weight:lighter;text-shadow:2px 1px black'
        };
    }
    
    if (numericRating > 0) {
        return {
            text: rating,
            style: 'color: var(--upVote);font-family:mario;font-weight:lighter;text-shadow:2px 1px black'
        };
    }
    
    return { text: rating, style: '' };
}

// ========================================
// Torrent Data Extraction
// ========================================
function initTorrentInfo() {
    if (state.isAlternativePage) {
        extractTorrentsFromAlternativePage();
    } else {
        extractTorrentsFromStandardPage();
    }
}

function extractTorrentsFromAlternativePage() {
    const content = document.getElementById('content');
    const torrentList = content.children[0].children[CONTENT_CHILD_INDICES.TORRENT_LIST_POSITION].children[0];
    
    for (let i = 1; i < torrentList.children.length; i++) {
        const row = torrentList.children[i];
        const torrent = parseAlternativePageTorrent(row);
        state.groups.push(torrent);
    }
}

function parseAlternativePageTorrent(row) {
    const category = row.children[0].children[0].classList[0];
    const isSpecialCategory = isSpecialCategoryType(category);
    
    if (isSpecialCategory) {
        return new Torrent(
            row.children[1].children[1].children[0].getAttribute('href'),
            row.children[1].children[1].children[0].innerHTML.split(' <')[0],
            category,
            'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
        );
    }
    
    return new Torrent(
        row.children[1].children[2].children[0].getAttribute('href'),
        row.children[1].children[2].children[0].innerHTML.split(' <')[0],
        category,
        'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
    );
}

function extractTorrentsFromStandardPage() {
    const torrentElements = document.querySelectorAll(DOM_SELECTORS.GROUP_ID);
    torrentElements.forEach(torrentElement => {
        const torrent = parseStandardPageTorrent(torrentElement);;
        state.groups.push(torrent);
    });
}

function parseStandardPageTorrent(torrentElement) {
    const category = torrentElement.children[0].children[0].children[0].classList[0];
    // const isSpecialCategory = isSpecialCategoryType(category);
    
    // if (isSpecialCategory) {
    //     return createSpecialCategoryTorrent(torrentElement, category);
    // }
    
    return createStandardTorrent(torrentElement, category);
}

// function isSpecialCategoryType(category) {
//     return category === CATEGORY_TYPES.OST ||
//            category === CATEGORY_TYPES.APPLICATIONS ||
//            category === CATEGORY_TYPES.EBOOKS;
// }

// function createSpecialCategoryTorrent(element, category) {
//     return new Torrent(
//         element.children[2].children[0].children[0].getAttribute('href'),
//         element.children[2].children[0].children[0].innerHTML,
//         category,
//         element.children[2].children[1].innerHTML.substring(1, 5),
//         'N/A',
//         element.children[3].innerHTML,
//         element.children[10].children[0].classList.contains('checked'),
//         element.classList.contains('sticky'),
//         element.children[4].innerHTML,
//         element.children[6].innerHTML
//     );
// }

function getTextLinesFromElement(element) {
    if (!element) {
        return [];
    }

    return element.innerText
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(line => line.length > 0);
}

function createStandardTorrent(element, category) {

    let itemLink = '';
    let itemName = '';
    let itemCodec = '';
    let itemMedium = '';
    let itemImdbRating = '';
    let itemFeatured = false;
    let itemNewtag = false;
    let itemInternal = false;
    let itemExclusive = false;
    let itemGenres = '';
    const itemWhenLines = getTextLinesFromElement(element.children[4]);   
    const itemSizeLines = getTextLinesFromElement(element.children[5]);
    let itemSnatched = element.children[6].innerHTML.replace('times', '').trim();
    let itemSeeds = element.children[7].innerHTML;
    let itemLeechers = element.children[8].innerHTML;
    let itemDownloadLink = '';
    let itemRssAdd = '';
    let itemBookmarkAdd = '';
    let itemWishlistAdd = '';
    let imdbLinkInnerHTML = '';
    let itemRssAddId = '';
    let imageLink = '';
    let itemFreeleech = '';
    
    if (element.classList.contains('featured')) {
        itemFeatured = true;
    }
    const aTags = element.getElementsByTagName('a');
    const bTags = element.getElementsByTagName('b');
    const tdTags = element.getElementsByTagName('td');
    const spanTags = element.getElementsByTagName('span');
    const divTags = element.getElementsByTagName('div');
    for (let i = 0; i < aTags.length; i++) {
        if (aTags[i].hasAttribute('data-imdb-link')) {
            itemImdbRating = aTags[i].innerText.replace(' ', '<br>');
        }
        if (aTags[i].href.includes('/details.php?id=') && aTags[i].parentElement === bTags[0]) {
            itemLink = 'https://hdbits.org' + aTags[i].getAttribute('href');
            itemName = aTags[i].innerText;
                        // Check for freeleech status in download link title
            const linkTitle = aTags[i].getAttribute('title');
            if (linkTitle) {
                if (linkTitle.startsWith('100% FL')) {
                    itemFreeleech = '100%';
                    console.log('100% Freeleech detected: ' + itemName);
                } else if (linkTitle.startsWith('50% Free Leech')) {
                    itemFreeleech = '50%';
                    console.log('50% Freeleech detected: ' + itemName);
                } else if (linkTitle.startsWith('25% Free Leech')) {
                    itemFreeleech = '25%';
                    console.log('25% Freeleech detected: ' + itemName);
                } else if (linkTitle.startsWith('Neutral Leech')) {
                    itemFreeleech = 'Neutral';
                    console.log('Neutral Leech detected: ' + itemName);
                }
            }
        }
        if (aTags[i].classList.contains('js-download')) {
            itemDownloadLink = 'https://hdbits.org' + aTags[i].getAttribute('href');
        }
        if (aTags[i].classList.contains('js-rssadd')) {
            itemRssAdd = aTags[i].getAttribute('href');
            itemRssAddId = aTags[i].getAttribute('id');
        }
        if (aTags[i].classList.contains('js-bookmarkadd')) {
            itemBookmarkAdd = aTags[i].getAttribute('href');
        }
        if (aTags[i].classList.contains('js-wishlistadd')) {
            itemWishlistAdd = aTags[i].getAttribute('href');
        }
    }
    for (let i = 0; i < tdTags.length; i++) {
        if (tdTags[i].classList.contains('catcell')) {
            if (tdTags[i].id.includes('codec')) {
                itemCodec = tdTags[i].id;
                itemMedium = tdTags[i].children[0].classList[0];
            }
        }
    }
    for (let i = 0; i < spanTags.length; i++) {
        if (spanTags[i].classList.contains('new')) {
            itemNewtag = true;
        }
        if (spanTags[i].classList.contains('internal')) {
            itemInternal = true;
        }
        if (spanTags[i].classList.contains('exclusive')) {
            itemExclusive = true;
        }
        if (spanTags[i].classList.contains('genres')) {
            // Extract genre names from anchor tags inside the genres span
            const genreLinks = spanTags[i].querySelectorAll('a');
            itemGenres = Array.from(genreLinks).map(a => a.textContent).join(', ');
        }
    }
    for (let i = 0; i < divTags.length; i++) {
        if (divTags[i].classList.contains('browse_imdb_poster')) {
            imageLink = 'https://hdbits.org' + divTags[i].children[0].getAttribute('src');
        }
    }

    // Order: link, name, category, codec, medium, imdbRating, featured, newtag, internal, exclusive, genres, when, size
    const normalizedWhen = itemWhenLines.length ? itemWhenLines : ['-'];
    const normalizedSize = itemSizeLines.length ? itemSizeLines : ['-'];

    return new Torrent(
        itemLink,
        itemName,
        category,
        itemCodec,
        itemMedium,
        itemImdbRating,
        itemFeatured,
        itemNewtag,
        itemInternal,
        itemExclusive,
        itemGenres,
        normalizedWhen,
        normalizedSize,
        itemDownloadLink,
        itemRssAdd,
        itemBookmarkAdd,
        itemWishlistAdd,
        itemRssAddId,
        imageLink,
        itemSeeds,
        itemSnatched,
        itemLeechers,
        itemFreeleech
    );
}

// ========================================
// Script Initialization
// ========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}