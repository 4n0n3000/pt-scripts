// ==UserScript==
// @name         GGn Torrent Gallery
// @namespace    https://github.com/4n0n3000/pt-scripts
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_gallery_script.user.js
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ggn/ggn_gallery_script.user.js
// @version      1.2.0
// @description  GGn Torrent Gallery Script
// @include      https://gazellegames.net/torrents.php*
// @exclude      https://gazellegames.net/torrents.php?id*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @require      https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.js
// @connect      gazellegames.net
// @run-at       document-start
// @author       BEY0NDER
// ==/UserScript==
// Thanks RobotFish for the barebones script

// ========================================
// Constants
// ========================================
const STORAGE_KEY_GALLERY_VIEW = 'galleryView';
const CACHE_KEY_PREFIX = 'ggn.cover:';
const CONFIG_ID = 'GGN_Gallery_Config';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_EXPIRY_DAYS = 7;
const DEFAULT_BLUR_AMOUNT = 18;
const DEFAULT_CARDS_PER_ROW = '5';

const CARD_LAYOUT_CONFIGS = {
    '5': { width: '220px', fontSize: '10pt', fontMinus: '1pt', fontPlus: '1pt', imgWidth: '28px', imgHeight: '28px' },
    '6': { width: '200px', fontSize: '9pt', fontMinus: '1pt', fontPlus: '1pt', imgWidth: '20px', imgHeight: '20px' },
    '7': { width: '160px', fontSize: '8pt', fontMinus: '1pt', fontPlus: '1pt', imgWidth: '15px', imgHeight: '15px' },
    '8': { width: '140px', fontSize: '7pt', fontMinus: '0.5pt', fontPlus: '0.5pt', imgWidth: '10px', imgHeight: '10px' }
};

const CATEGORY_TYPES = {
    OST: 'cats_ost',
    APPLICATIONS: 'cats_applications',
    EBOOKS: 'cats_ebooks'
};

const DOM_SELECTORS = {
    TORRENT_LINK: "[title='View Torrent']",
    ALBUM_ART: '.box_albumart img',
    TORRENT_TABLE: '#torrent_table, .grouping, .box .pad table',
    GROUP_CLASS: '.group'
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
    constructor(link, name, platform, year, ageRating, userRating, checked, sticky, when, size) {
        this.link = link;
        this.name = name;
        this.img = '';
        this.platform = platform;
        this.year = year;
        this.ageRating = ageRating;
        this.userRating = userRating;
        this.checked = checked;
        this.sticky = sticky;
        this.when = when;
        this.size = size;
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
    toggleOriginalTable(inverseDisplayValue);
}

function toggleOriginalTable(displayValue) {
    try {
        const contentIndex = state.isAlternativePage ? 0 : 1;
        const content = document.getElementById('content');
        const original = content?.children[contentIndex]?.children[CONTENT_CHILD_INDICES.ORIGINAL_TABLE_POSITION]?.children[0];
        
        if (original) {
            original.style.display = displayValue;
        }
    } catch (e) {
        const table = document.querySelector(DOM_SELECTORS.TORRENT_TABLE);
        if (table) {
            table.style.display = displayValue;
        }
    }
}

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
            id: 'GGN_Gallery_Config',
            title: `
                <div>
                    <div style="user-select: none; font-family: 'Bebas Neue', Helvetica, Tahoma, Geneva, sans-serif; background-color: #fff; -webkit-background-clip: text; -webkit-text-fill-color: transparent; -webkit-filter: brightness(110%); filter: brightness(110%); transition: all 0.3s; font-weight: bold; padding-top: 3%;">
                        GGn Gallery Settings<br>
                    </div>
                    <div style="margin-top:15px"><small style="font-weight: 300; color: #95a5a6; display: block; font-size: 0.6rem; margin-top: 5px;"><i>Hover over settings marked with * to see more information</i></small></div>
                </div>
            `,
            fields: {
                enableFooter: { label: 'Enable Footer Details', type: 'checkbox', default: true, title: 'Toggle footer details for more group info' },
                widthConfig: { label: 'Card Per Row', type: 'select', options: ['5','6','7','8'], default: '5', title: 'Number of cards per row' },
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
                    const btnHolder = doc.getElementById('GGN_Gallery_Config_buttons_holder');
                    if (btnHolder) btnHolder.appendChild(versionEl);

                    const saveButton = doc.getElementById('GGN_Gallery_Config_saveBtn');
                    if (saveButton) {
                        saveButton.addEventListener('click', () => {
                            saveButton.classList.add('success');
                            setTimeout(() => saveButton.classList.remove('success'), 500);
                        });
                    }

                    const checkboxSections = [ 'enableFooter' ];
                    checkboxSections.forEach(field => {
                        const el = doc.getElementById(`GGN_Gallery_Config_${field}_var`);
                        if (el) el.classList.add('checkbox-section');
                    });

                    const sliderSections = [ 'blurAmount' ];
                    sliderSections.forEach(field => {
                        const el = doc.getElementById(`GGN_Gallery_Config_${field}_var`);
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
                #GGN_Gallery_Config { background: #172a39; margin: 0; padding: 10px 20px; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                #GGN_Gallery_Config .config_header { color: #fff; padding-bottom: 10px; font-weight: 100; justify-content: center; align-items: center; text-align: center; border-bottom: none; background: transparent; margin: 0; }
                #GGN_Gallery_Config .config_var { display: flex; flex-direction: row; text-align: left; justify-content: space-between; align-items: center; width: 90%; margin-left: 26px; padding: 4px 0; border-bottom: 1px solid #7470703d; margin-top: 5px; margin-bottom: 5px; }
                #GGN_Gallery_Config .field_label { color: #fff; width: 45%; user-select: none; font-weight: 500; }
                #GGN_Gallery_Config .field_label.disabled { color: #B0BEC5; }
                #GGN_Gallery_Config input[type="text"],
                #GGN_Gallery_Config input[type="number"],
                #GGN_Gallery_Config select { background: rgba(255,255,255,0.9); border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box; font-size: 0.9em; padding: 8px; width: 55%; transition: all 0.3s ease; }
                #GGN_Gallery_Config input[type="text"]:focus,
                #GGN_Gallery_Config input[type="number"]:focus,
                #GGN_Gallery_Config select:focus { border-color: #2C3E50; box-shadow: 0 0 5px rgba(134, 212, 6, 0.6); outline: none; }
                #GGN_Gallery_Config input[type="checkbox"] { cursor: pointer; margin-right: 4px !important; width: 16px; height: 16px; }
                #GGN_Gallery_Config .reset { color: #95a5a6; text-decoration: none; user-select: none; }
                #GGN_Gallery_Config_buttons_holder { display: grid; column-gap: 20px; row-gap: 16px; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; width: 90%; margin-left: 26px; height: 94px; text-align: center; align-items: center; margin-top: 20px; }
                #GGN_Gallery_Config .reset_holder { grid-column: 3; grid-row: 2; }
                #GGN_Gallery_Config .version_label { grid-column: 1; grid-row: 2; text-align: left !important; }
                #GGN_Gallery_Config_resetLink { text-transform: lowercase; background: transparent; color: #95a5a6; }
                #GGN_Gallery_Config .version_label:hover,
                #GGN_Gallery_Config_resetLink:hover { text-decoration: underline; }
                #GGN_Gallery_Config .saveclose_buttons { margin: 22px 0px 4px; }
                #GGN_Gallery_Config_saveBtn { grid-column: 2; grid-row: 1; background-color: #2C3E50; color: #FFFFFF; border: none; border-radius: 5px; padding: 15px 20px; font-size: 1rem; font-weight: 500; cursor: pointer; will-change: background-color, transform; transition: background-color 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.2); padding-top: 6px !important; padding-bottom: 6px !important; }
                #GGN_Gallery_Config_saveBtn:hover { background-color: #34495E; transform: translateY(-2px); }
                #GGN_Gallery_Config_saveBtn:active { background-color: #86d406; transform: translateY(1px); }
                #GGN_Gallery_Config_saveBtn.success { box-shadow: 0 0 6px 3px rgba(134, 212, 6, 0.6); }
                #GGN_Gallery_Config_closeBtn { grid-column: 3; grid-row: 1; background-color: #2C3E50; color: #FFFFFF; border: none; border-radius: 5px; padding: 15px 20px; font-size: 1rem; font-weight: 500; cursor: pointer; will-change: background-color, transform; transition: background-color 0.2s ease, transform 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.2); padding-top: 6px !important; padding-bottom: 6px !important; }
                #GGN_Gallery_Config_closeBtn:hover { background-color: #34495E; transform: translateY(-2px); }
                #GGN_Gallery_Config_closeBtn:active { background-color: #2C3E50; transform: translateY(1px); }
                /* Tooltip styling */
                #GGN_Gallery_Config .field_label[title]:hover::after { content: attr(title); position: absolute; background: #2C3E50; color: white; padding: 5px 10px; border-radius: 3px; font-size: 0.8em; max-width: 300px; z-index: 100; margin-top: 25px; left: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                /* Animations */
                @keyframes pulse { 0%,100%{box-shadow:0 0 6px 2px rgba(255,128,0,0.5);} 50%{box-shadow:0 0 10px 4px #86d406;} }
            `
        });

        try { if (GM_config && typeof GM_config.onSave !== 'undefined') { GM_config.onSave = applyConfigStyles; } } catch(e) {}

        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('GGn Gallery: Settings', function(){ GM_config.open(); });
            GM_registerMenuCommand('GGn Gallery: Clear Cover Cache', clearCoverCache);
        }

        applyConfigStyles();
    } catch(e) {
        console.warn('[GGN Gallery] GM_config init failed', e);
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
        applyCardLayout();
    } catch (e) {
        console.warn('[GGN Gallery] Failed to apply config styles', e);
    }
}

function applyFooterVisibility() {
    const footerEnabled = getConfigValue('enableFooter', true);
    const displayValue = footerEnabled ? 'block' : 'none';
    document.documentElement.style.setProperty('--footer-details', displayValue);
}

function applyBlurAmount() {
    const blurAmount = getConfigValue('blurAmount', DEFAULT_BLUR_AMOUNT);
    document.documentElement.style.setProperty('--ggn-blur', `${blurAmount}px`);
}

function applyCardLayout() {
    const cardsPerRow = getConfigValue('widthConfig', DEFAULT_CARDS_PER_ROW);
    const config = CARD_LAYOUT_CONFIGS[cardsPerRow];
    
    if (!config) return;
    
    document.documentElement.style.setProperty('--ggn-width', config.width);
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
        console.warn('[GGN Gallery] Failed to cache data', e);
    }
}

function clearCoverCache() {
    try {
        const keys = (typeof GM_listValues === 'function') ? GM_listValues() : [];
        const clearedCount = clearCoverCacheKeys(keys);
        alert(`GGn Gallery: Cleared ${clearedCount} cached covers`);
    } catch (e) {
        alert('GGn Gallery: Failed to clear cache');
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

function markImageAsUnavailable(img) {
    if (img) {
        img.classList.add('no-image');
    }
}

function initImages() {
    const torrentLinks = document.querySelectorAll(DOM_SELECTORS.TORRENT_LINK);
    torrentLinks.forEach(item => {
        const link = item.getAttribute('href');
        const cachedCover = getCachedCover(link);
        
        if (cachedCover) {
            applyCachedCoverToGroup(link, cachedCover);
            return;
        }
        
        fetchCoverImage(link);
    });
}

function applyCachedCoverToGroup(link, coverUrl) {
    const index = findGroupIndexByLink(link);
    if (index !== -1) {
        applyCoverToIndex(index, coverUrl);
    }
}

function findGroupIndexByLink(link) {
    return state.groups.findIndex(group => group.link === link);
}

function fetchCoverImage(link) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: `/${link}`,
        onload: response => handleCoverImageResponse(response, link)
    });
}

function handleCoverImageResponse(response, link) {
    const doc = parseResponseDocument(response);
    const imgNode = doc.querySelector(DOM_SELECTORS.ALBUM_ART);
    const imageSrc = imgNode ? imgNode.getAttribute('src') : '';
    
    const index = findGroupIndexByLink(link);
    if (index !== -1) {
        if (imageSrc) {
            setCachedCover(link, imageSrc);
        }
        applyCoverToIndex(index, imageSrc);
    }
}

function parseResponseDocument(response) {
    if (!response.responseXML) {
        return new DOMParser().parseFromString(response.responseText, 'text/html');
    }
    return response.responseXML;
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
    const content = document.getElementById('content');
    const contentIndex = state.isAlternativePage ? 0 : 1;
    const targetChild = content.children[contentIndex];
    
    targetChild.insertBefore(gallery, targetChild.children[CONTENT_CHILD_INDICES.GALLERY_INSERT_POSITION]);
    
    if (state.isAlternativePage) {
        targetChild.children[CONTENT_CHILD_INDICES.ORIGINAL_TABLE_POSITION].style.marginTop = '5px';
    }
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
	  :root{--ggn-card-bg:#1c3145;--ggn-card-bg2:#2b4e66;--ggn-text:#e6f1f7;--ggn-muted:#97a8b6;--ggn-overlay:rgba(0,0,0,0.35);}
	  #gallery_view{background:linear-gradient(var(--ggn-card-bg2),var(--ggn-card-bg));padding:8px;border-radius:6px}
	  #gallery_info{display:flex;align-items:center;justify-content:space-between;color:var(--ggn-text)}
	  #galleryToggle{float:right;margin-left:5px;color:var(--ggn-text);text-decoration:none;cursor:pointer}
	  #galleryToggle:hover{text-decoration:underline}
	  #collageBody{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--ggn-width, 220px), 1fr));gap:10px;float:inline-start;margin-top:10px;background:rgba(27,47,63,0.35);padding:8px;border-radius:6px;width:-moz-available;}
	  .groupWrapper{height:auto;box-sizing:border-box;overflow:hidden;background:linear-gradient(var(--ggn-card-bg2),var(--ggn-card-bg));border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.3);transition:scale .5s ease, box-shadow .15s ease;position:relative}
	  .groupWrapper:hover{scale:103%;box-shadow:0 6px 18px rgba(0,0,0,0.35)}
	  .releaseMedia{position:static;display:flex;align-items:center;justify-content:center;aspect-ratio:3/4}
	  .coverBg{position:absolute;inset:0;background-position:center;background-repeat:no-repeat;background-size:cover;filter:blur(var(--ggn-blur, 18px)) saturate(110%) brightness(80%);transform:scale(1)}
	  .coverBg::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.25))}
	  .coverImage{display:block;position:relative;max-width:100%;max-height:100%;width:80%;height:auto;object-fit:contain;margin:auto;border-radius:5px}
	  .releaseTitle{text-align:center;font-size:10pt;display:block;padding:10px;overflow:hidden;line-height:1.3;white-space:nowrap;text-overflow:ellipsis;color:var(--ggn-text);background:linear-gradient(var(--ggn-card-bg2),var(--ggn-card-bg));position:relative;z-index:1}
	  .releaseFooter{text-align:center;font-size:10pt;display:var(--footer-details);padding:10px;overflow:hidden;line-height:1.3;white-space:nowrap;text-overflow:ellipsis;color:var(--ggn-text);background:linear-gradient(var(--ggn-card-bg2),var(--ggn-card-bg));position:relative;z-index:1;font-weight:bold}
      .hiddenType{color:#525252 !important;text-decoration:line-through}
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
            <span class="${group.platform}" title="${group.platform}" style="height:var(--platform-img-height);width:var(--platform-img-width);background-size:cover"></span>
            <a href="${group.link}" style="overflow:hidden;text-overflow:ellipsis;padding-left:6px;padding-right:6px;width:82%">${group.name}</a>
            <span></span>
        </div>`;
    return releaseTitle;
}

function createReleaseMedia(group) {
    const releaseMedia = createElement('div', { className: 'releaseMedia' });
    const coverBg = createElement('div', { className: 'coverBg' });
    const imageLink = createElement('a', { href: group.link });
    const image = createCoverImage(group);
    
    imageLink.append(image);
    releaseMedia.append(coverBg, imageLink);
    return releaseMedia;
}

function createCoverImage(group) {
    const image = createElement('img', {
        className: 'coverImage',
        alt: group.name,
        src: group.img
    });
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.classList.add('no-image'));
    return image;
}

function createReleaseFooter(group) {
    const releaseFooter = createElement('div', { className: 'releaseFooter' });
    const ratingDisplay = formatRatingDisplay(group.userRating);
    const stickyVisibility = group.sticky ? 'visible' : 'hidden';
    const checkIcon = group.checked ? 'checkmark.png' : 'crossn.png';
    
    releaseFooter.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size:var(--footer-font-size)">Rating: <span style="${ratingDisplay.style}">${ratingDisplay.text}</span></span>
            <span style="font-size:calc(var(--footer-font-size) + var(--footer-font-plus))">${group.year}</span>
            <span style="font-size:calc(var(--footer-font-size) + var(--footer-font-plus))">${group.when}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
            <span style="font-size: var(--footer-font-size); visibility: ${stickyVisibility}"><img src="https://gazellegames.net/static/styles/game_room/images/pin.png" style="width: 12px; height: 12px; vertical-align: middle;"></span>
            <span style="font-size:calc(var(--footer-font-size) - var(--footer-font-minus))">${group.size}</span>
            <span style="font-size: var(--footer-font-size)"><img src="https://gazellegames.net/static/styles/game_room/images/${checkIcon}" style="width: 12px; height: 12px; vertical-align: middle;"></span>
        </div>`;
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
    const torrentElements = document.querySelectorAll(DOM_SELECTORS.GROUP_CLASS);
    
    torrentElements.forEach(torrentElement => {
        const torrent = parseStandardPageTorrent(torrentElement);
        state.groups.push(torrent);
    });
}

function parseStandardPageTorrent(torrentElement) {
    const category = torrentElement.children[1].children[0].classList[0];
    const isSpecialCategory = isSpecialCategoryType(category);
    
    if (isSpecialCategory) {
        return createSpecialCategoryTorrent(torrentElement, category);
    }
    
    return createStandardTorrent(torrentElement, category);
}

function isSpecialCategoryType(category) {
    return category === CATEGORY_TYPES.OST ||
           category === CATEGORY_TYPES.APPLICATIONS ||
           category === CATEGORY_TYPES.EBOOKS;
}

function createSpecialCategoryTorrent(element, category) {
    return new Torrent(
        element.children[2].children[0].children[0].getAttribute('href'),
        element.children[2].children[0].children[0].innerHTML,
        category,
        element.children[2].children[1].innerHTML.substring(1, 5),
        'N/A',
        element.children[3].innerHTML,
        element.children[10].children[0].classList.contains('checked'),
        element.classList.contains('sticky'),
        element.children[4].innerHTML,
        element.children[6].innerHTML
    );
}

function createStandardTorrent(element, category) {
    return new Torrent(
        element.children[2].children[2].children[0].getAttribute('href'),
        element.children[2].children[2].children[0].innerHTML,
        category,
        element.children[2].children[3].innerHTML.substring(1, 5),
        element.children[2].children[4].innerHTML,
        element.children[3].innerHTML,
        element.children[10].children[0].classList.contains('checked'),
        element.classList.contains('sticky'),
        element.children[4].innerHTML,
        element.children[6].innerHTML
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