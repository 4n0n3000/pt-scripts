// ==UserScript==
// @name         PTP Radarr Integration
// @namespace    https://openuserjs.org/users/SB100
// @description  The PTP <-> Radarr Integration we always wanted (Modded by BEY0NDER Custom Headers)
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ptp/PTP_Radarr_Integration.meta.js
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/ptp/PTP_Radarr_Integration.meta.js
// @version      1.6.4-BEY0NDER
// @author       SB100
// @copyright    2022, SB100 (https://openuserjs.org/users/SB100)
// @license      MIT
// @include      https://passthepopcorn.me/*
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @icon         https://passthepopcorn.me/favicon.ico
// ==/UserScript==

// ==OpenUserJS==
// @author SB100
// ==/OpenUserJS==

/* jshint esversion: 8 */

/**
 * =============================
 * ADVANCED OPTIONS
 * =============================
 */

// show debug logs in the browser console
const SETTING_DEBUG = false;

// how long to cache radarr existing movies for
// default = 1000 * 60 * 10 = 10 minutes
const SETTING_CACHE_TIME = 1000 * 60 * 10;

/**
 * =============================
 * END ADVANCED OPTIONS
 * DO NOT MODIFY BELOW THIS LINE
 * =============================
 */

// ================================= Config

/**
 * Get a config value from the GM cache
 */
async function getConfig(key, fallback = '') {
    return GM.getValue(key, fallback);
}

/**
 * Set a config value into the GM cache
 */
async function setConfig(key, value) {
    await GM.setValue(key, value);
}

/**
 * Get all settings stored in localStorage for this script
 */
function getSettings() {
    const settings = window.localStorage.getItem('radarrIntegrationSettings');
    // eslint-disable-next-line no-use-before-define
    return JsonParseWithDefault(settings || {}, {});
}

/**
 * Set a setting into localStorage for this script
 */
function setSetting(name, value) {
    const json = getSettings();
    json[name] = value;
    window.localStorage.setItem(
        'radarrIntegrationSettings',
        JSON.stringify(json)
    );
}

/**
 * Set a radarr bar setting into the settings localStorage object
 * @param type
 * @param value
 */
function setRadarrBarSetting(type, value) {
    const existingSettings = getSettings().radarrBar || {};
    const newSettings = {
        ...existingSettings,
        [type]: value
    };
    setSetting('radarrBar', newSettings);
}

// ================================= Helpers

/**
 * Try parsing a string into JSON, otherwise fallback
 */
function JsonParseWithDefault(s, fallback = null) {
    try {
        return JSON.parse(s);
    }
    catch (e) {
        return fallback;
    }
}

/**
 * Print a debug message, if enabled
 */
function debug(strOrStrArray) {
    if (!SETTING_DEBUG) return;
    // eslint-disable-next-line no-console
    console.log(
        `[PTP Radarr Integration] ${
            Array.isArray(strOrStrArray) ? strOrStrArray.join(' - ') : strOrStrArray
        }`
    );
}

/**
 * Wait some time
 */
// eslint-disable-next-line no-promise-executor-return
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chunk an array into pieces
 */
function chunk(arr, chunkSize) {
    if (chunkSize <= 0) {
        throw new Error('Invalid chunk size');
    }

    const r = [];
    for (let i = 0, len = arr.length; i < len; i += chunkSize) {
        r.push(arr.slice(i, i + chunkSize));
    }

    return r;
}

/**
 * Check if we're using the old setting format for storing imdbIds
 * @param imdbIds
 * @returns {arg is any[]}
 */
function isImdbIdsSettingOutdated(imdbIds) {
    return Array.isArray(imdbIds);
}

// ================================= Query

/**
 * Query the radarr api
 */
async function query(path, method = 'get', params = {}) {
    let resolver;
    let rejecter;
    const p = new Promise((resolveFn, rejectFn) => {
        resolver = resolveFn;
        rejecter = rejectFn;
    });

    const radarrUrl = (await getConfig('host')).replace(/\/$/, '');
    const apiKey = await getConfig('key');

    const headerName = await getConfig('headerName', '');
    const headerValue = await getConfig('headerValue', '');

    const customHeaders = {};
    if (headerName && headerValue) {
        customHeaders[headerName] = headerValue;
    }

    const url = new URL(`${radarrUrl}/api/v3${path}`);
    const obj = {
        method,
        timeout: 60000,
        onloadstart: () => {},
        onload: (response) => resolver(response),
        onerror: (response) => rejecter(response),
        ontimeout: (response) => rejecter(response),
    };

    if (method === 'post') {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders, // Add custom headers
        };

        url.search = new URLSearchParams({
            apikey: apiKey
        }).toString();

        const final = Object.assign(obj, {
            url: url.toString(),
            headers,
            data: JSON.stringify(params),
        });

        GM.xmlHttpRequest(final);
    }
    else {
        const newParams = {
            ...params,
            apikey: apiKey
        };
        url.search = new URLSearchParams(newParams).toString();
        console.log(customHeaders);
        const final = Object.assign(obj, {
            url: url.toString(),
            headers: customHeaders, // Add custom headers for GET requests too
        });

        GM.xmlHttpRequest(final);
    }

    return p;
}

/**
 * Get request to Radarr API. Parse results
 */
function radarrGet(path, params = {}) {
    return query(path, 'get', params).then((response) =>
        JSON.parse(response.responseText)
    );
}

/**
 * Post request to Radarr API. Parse results
 */
function radarrPost(path, params = {}) {
    return query(path, 'post', params).then((response) =>
        JSON.parse(response.responseText)
    );
}

/**
 * Get the data needed to populate the radarr bar
 */
async function getDataForRadarrBar() {
    try {
        const [qualityProfiles, rootFolders, tags] = await Promise.all([
            radarrGet('/qualityprofile'),
            radarrGet('/rootfolder'),
            radarrGet('/tag'),
        ]);

        return {
            qualityProfiles,
            rootFolders,
            tags,
        };
    }
    catch (e) {
        debug([`Couldn't connect to Radarr`, e.message]);
        return {
            error: true,
        };
    }
}

/**
 * Get and cache existing imdbIds from radarr
 */
async function getExistingRadarrImdbIds() {
    try {
        const {
            imdbIds,
            lastUpdated
        } = getSettings();

        if (
            !lastUpdated ||
            new Date().getTime() > lastUpdated + SETTING_CACHE_TIME ||
            isImdbIdsSettingOutdated(imdbIds)
        ) {
            const hasSuccessfulConnection = await getConfig(
                'hasSuccessfulConnection',
                false
            );
            if (!hasSuccessfulConnection) {
                return [];
            }

            const allMovies = await radarrGet('/movie');
            const radarrImdbIds = allMovies.reduce((result, movie) => {
                // eslint-disable-next-line no-param-reassign
                result[movie.imdbId] = movie.titleSlug;
                return result;
            }, {});

            setSetting('lastUpdated', new Date().getTime());
            setSetting('imdbIds', radarrImdbIds);

            return radarrImdbIds;
        }

        return imdbIds;
    }
    catch (e) {
        await setConfig('hasSuccessfulConnection', false);
        const radarrBar = document.querySelector('.ptp-radarr__bar');
        radarrBar.dataset.isLoaded = '0';
        debug([`Couldn't get existing IMDb IDs from Radarr`, e.message]);
        return [];
    }
}

// ================================= UI Helpers

/**
 * Tries to get the theme the user is using
 */
function getTheme() {
    const linkTags = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
    );

    for (let i = 0, len = linkTags.length; i < len; i += 1) {
        const tag = linkTags[i];
        if (tag.href.includes('blue-night')) {
            return 'blue-night';
        }
        if (tag.href.includes('marcel')) {
            return 'marcel';
        }
    }

    return 'default';
}

/**
 * Get necessary selectors depending on the view mode
 * @returns {{item: string, img: string, imdb: string, shouldObserveForMutations: boolean}|{}}
 *   - item = single movie containing img and imdb
 *   - img = img / a element to attach checkbox to
 *   - imdb = element to get the IMDb ID from
 *   - shouldObserveForMutations = whether MutationObserver should watch for changes to reload checkboxes
 */
function getImgAndImdbSelectors() {
    const {
        href
    } = window.location;

    /* eslint-disable no-nested-ternary */
    const viewMode = href.includes('torrents.php?id=') ?
        'Custom-Movie' :
        href.includes('torrents.php') ?
            localStorage.getItem('BrowseViewMode') :
            href.includes('collages.php') ?
                localStorage.getItem('CollectionViewMode') || 'Cover' :
                href.includes('top10.php') ?
                    localStorage.getItem('Top10MoviesViewMode') || 'Cover' :
                    href.includes('requests.php') ?
                        'Custom-Requests' :
                        null;
    /* eslint-enable no-nested-ternary */

    switch (viewMode) {
        case 'Cover':
            return {
                item: '.cover-movie-list__movie',
                img: '.cover-movie-list__movie__cover-link',
                imdb: '.cover-movie-list__movie__rating-and-tags a',
                shouldObserveForMutations: true,
            };

        case 'Huge':
            return {
                item: '.huge-movie-list__movie',
                img: '.huge-movie-list__movie__cover__link',
                imdb: '.huge-movie-list__movie__ratings__icon-column a',
                shouldObserveForMutations: true,
            };

        // don't support CompactList
        case 'CompactList':
        case 'SmallCover': // only on collage
            return {};

        // single movie page: torrents.php?id=xxx
        case 'Custom-Movie':
            return {
                item: '#torrents #content',
                img: '.sidebar-cover-image',
                imdb: '#movie-ratings-table td a',
            };

        // single request page: requests.php?action=view&id=xxx
        case 'Custom-Requests':
            return {
                item: '#requests #content',
                img: '.sidebar-cover-image',
                imdb: '#request-table td a',
            };

        case 'List':
        default:
            return {
                item: '.basic-movie-list__details-row',
                img: '.basic-movie-list__movie__cover-link',
                imdb: '.basic-movie-list__movie__rating__title a',
                shouldObserveForMutations: true,
            };
    }
}

/**
 * Show processing / selected text in the radarr bar
 * @param {'selected'|'processed'|'added'} type
 */
function toggleRadarrBarStatusText(type) {
    const selectedCont = document.querySelector(
        '.ptp-radarr__bar-label-text--selected'
    );
    const processedCont = document.querySelector(
        '.ptp-radarr__bar-label-text--processed'
    );
    const addedCont = document.querySelector(
        '.ptp-radarr__bar-label-text--added'
    );

    if (type === 'selected') {
        selectedCont.style.display = 'block';
        processedCont.style.display = 'none';
        addedCont.style.display = 'none';
    }
    else if (type === 'processed') {
        selectedCont.style.display = 'none';
        processedCont.style.display = 'block';
        addedCont.style.display = 'none';
    }
    else {
        selectedCont.style.display = 'none';
        processedCont.style.display = 'none';
        addedCont.style.display = 'block';
    }
}

// ================================= Event Handlers

/**
 * Stop navigation away from the page if a checkbox is selected
 */
const beforeUnloadListener = (event) => {
    event.preventDefault();
    // eslint-disable-next-line no-param-reassign
    event.returnValue = 'Are you sure you want to exit?';
    return event;
};

/**
 * Force all checkboxes to show if one is checked
 * Force Radarr Bar to show if one is selected
 */
function handleCheckboxChange() {
    const radarrBar = document.querySelector('.ptp-radarr__bar');
    const allCheckboxes = Array.from(
        document.querySelectorAll('.ptp-radarr__checkbox')
    );
    const allRibbons = Array.from(
        document.querySelectorAll('.ptp-radarr__ribbon')
    );

    if (allCheckboxes.some((checkbox) => checkbox.checked)) {
        allCheckboxes.forEach((checkbox) => {
            checkbox.classList.add('ptp-radarr__checkbox--forced');
        });
        allRibbons.forEach((ribbon) => {
            ribbon.classList.add('ptp-radarr__ribbon--forced');
        });

        if (!radarrBar.classList.contains('ptp-radarr__bar--showing')) {
            radarrBar.classList.add('ptp-radarr__bar--showing');
            window.addEventListener('beforeunload', beforeUnloadListener, {
                capture: true,
            });
        }

        // if it hasn't been already, add dropdowns to the radarr bar
        // eslint-disable-next-line no-use-before-define
        populateRadarrBar(radarrBar);

        // update movie selected counter
        const numMoviesElems = Array.from(
            document.querySelectorAll('.ptp-radarr__bar-num-movies--selected')
        );
        if (numMoviesElems.length) {
            numMoviesElems.forEach((numMoviesElem) => {
                // eslint-disable-next-line no-param-reassign
                numMoviesElem.innerText = Array.from(
                    document.querySelectorAll('.ptp-radarr__checkbox:checked')
                ).length;
            });
        }
    }
    else {
        allCheckboxes.forEach((checkbox) => {
            checkbox.classList.remove('ptp-radarr__checkbox--forced');
        });
        allRibbons.forEach((ribbon) => {
            ribbon.classList.remove('ptp-radarr__ribbon--forced');
        });

        if (radarrBar.classList.contains('ptp-radarr__bar--showing')) {
            radarrBar.classList.remove('ptp-radarr__bar--showing');
            window.removeEventListener('beforeunload', beforeUnloadListener, {
                capture: true,
            });
        }
    }
}

/**
 * When the select all / none button is clicked, do the action, and trigger handler event
 */
function handleRadarrBarClick(event) {
    const selectAllElem = document.querySelector('#ptp-radarr__bar-select-all');
    const selectNoneElem = document.querySelector('#ptp-radarr__bar-select-none');
    const multiSelectOptions = document.querySelector('.multi-select__options');

    // select all / none
    if ([selectAllElem, selectNoneElem].includes(event.target)) {
        const shouldSelectAll = event.target === selectAllElem;
        Array.from(document.querySelectorAll('.ptp-radarr__checkbox')).forEach(
            (checkbox) => {
                // eslint-disable-next-line no-param-reassign
                checkbox.checked = shouldSelectAll;
            }
        );

        handleCheckboxChange();
    }

    // if options is opened, and we click outside the multi-select, close options
    if (
        multiSelectOptions &&
        multiSelectOptions.classList.contains('multi-select__options--opened')
    ) {
        const targetSelector = '.multi-select';
        let {
            target
        } = event;

        while (target && target.matches('.ptp-radarr__bar') === false) {
            if (target.matches(targetSelector)) {
                return;
            }

            target = target.parentNode;
        }

        multiSelectOptions.classList.remove('multi-select__options--opened');
    }
}

/**
 * When form is submitted, add the selected movies to Radarr
 */
async function handleRadarrBarSubmit(event) {
    event.preventDefault();

    const addMoviesButton = document.getElementById('ptp-radarr__bar-submit');

    // if errored, and form is submitted, reset the form
    if (event.target.dataset.reset === '1') {
        // eslint-disable-next-line no-param-reassign
        event.target.dataset.reset = '0';
        addMoviesButton.value = 'Add Movie(s)';
        toggleRadarrBarStatusText('selected');
        return;
    }

    // get elements to update
    const selectedElem = document.querySelector(
        '.ptp-radarr__bar-num-movies--selected'
    );
    const processedElem = document.querySelector(
        '.ptp-radarr__bar-num-movies--processed'
    );
    const addedElem = document.querySelector(
        '.ptp-radarr__bar-num-movies--added'
    );
    const erroredElem = document.querySelector(
        '.ptp-radarr__bar-num-movies--errored'
    );
    const existingElem = document.querySelector(
        '.ptp-radarr__bar-num-movies--existing'
    );

    // disable the button
    addMoviesButton.value = 'Processing …';
    addMoviesButton.disabled = true;
    // eslint-disable-next-line no-param-reassign
    event.target.dataset.reset = '1';

    // show processing text
    toggleRadarrBarStatusText('processed');

    // get the form data
    const radarrBarFormData = Object.fromEntries(
        Array.from(new FormData(event.target))
    );

    const tagIds = Array.from(
        document.querySelectorAll('.multi-select__option-checkbox:checked')
    ).map((c) => parseInt(c.value, 10));

    try {
        // get existing movies
        const existingImdbIdObj = await getExistingRadarrImdbIds();
        const existingImdbIds = Object.keys(existingImdbIdObj);

        // get selected imdbs
        const imdbIds = Array.from(
            document.querySelectorAll('.ptp-radarr__checkbox:checked')
        ).map((checkbox) => checkbox.value);

        // calculate missing imdbs
        const missingImdbIds = imdbIds.filter(
            (id) => !existingImdbIds.includes(id)
        );

        // and chunk them
        const imdbChunks = chunk(missingImdbIds, 5);

        // process in chunks - get all the movie info, and push to an array
        const toImport = [];
        for (let j = 0, jLen = imdbChunks.length; j < jLen; j += 1) {
            const promises = imdbChunks[j].map((imdbId) =>
                radarrGet('/movie/lookup/imdb', {
                    imdbId
                })
            );

            const movieInfos = await Promise.all(promises);

            const addBodies = movieInfos.map((movieInfo) => ({
                ...movieInfo,
                qualityProfileId: parseInt(radarrBarFormData.qualityProfileId, 10),
                monitored: radarrBarFormData.monitor === true ||
                    radarrBarFormData.monitor === 'true',
                minimumAvailability: radarrBarFormData.minimumAvailability,
                rootFolderPath: radarrBarFormData.rootFolderPath,
                tags: tagIds,
                addOptions: {
                    searchForMovie: radarrBarFormData.searchForMovie !== undefined ||
                        radarrBarFormData.searchForMovie === 'on',
                },
            }));

            toImport.push(...addBodies);
            processedElem.innerHTML = toImport.length;

            await delay(5);
        }

        // add to radarr
        if (toImport.length) {
            addMoviesButton.value = 'Adding …';

            // chunk imports
            const toImportChunks = chunk(toImport, 10);
            const promises = toImportChunks.map((ic) =>
                radarrPost('/movie/import', ic)
            );
            // await all promises
            const importResults = await Promise.all(promises);
            // turn into a flat array
            const importResult = importResults.flat(5);
            // check results
            const {
                added,
                errored,
                missingObj
            } = importResult.reduce(
                (result, curr) => {
                    if (curr.errorCode) {
                        // eslint-disable-next-line no-param-reassign
                        result.errored += 1;
                        debug([`Error importing movie`, curr.errorMessage]);
                    }
                    else {
                        // eslint-disable-next-line no-param-reassign
                        result.added += 1;
                        // eslint-disable-next-line no-param-reassign
                        result.missingObj[curr.imdbId] = curr.titleSlug;
                    }

                    return result;
                }, {
                    added: 0,
                    errored: 0,
                    missingObj: {},
                }
            );

            // update stats to show user
            addedElem.innerHTML = `${added}`;
            erroredElem.innerHTML = `${errored}`;
            existingElem.innerHTML = `${imdbIds.length - missingImdbIds.length}`;

            // update cache, or wipe if issue
            if (errored > 0) {
                setSetting('lastUpdated', 0);
                setSetting('imdbIds', {});
            }
            else {
                setSetting('imdbIds', {
                    ...existingImdbIdObj,
                    ...missingObj
                });
            }

            // refresh the checkboxes to show the new ribbons
            // eslint-disable-next-line no-use-before-define
            await addCheckboxesToMovies();
            selectedElem.innerHTML = '0';
        }
        else {
            addedElem.innerHTML = '0';
            erroredElem.innerHTML = '0';
            existingElem.innerHTML = `${imdbIds.length - missingImdbIds.length}`;
        }
    }
    catch (e) {
        await setConfig('hasSuccessfulConnection', false);
        const radarrBar = document.querySelector('.ptp-radarr__bar');
        radarrBar.dataset.isLoaded = '0';
        radarrBar.innerHTML = `<div class="loading-icon__cont">Error adding to Radarr. <a href="#radarr">Recheck your connection</a> or check your browser console for more info</div>`;
        debug([`Couldn't import movie(s)`, e.message]);
        return;
    }

    // show number that was added and reset button
    toggleRadarrBarStatusText('added');
    addMoviesButton.disabled = false;
    addMoviesButton.value = 'Reset';
}

// ================================= UI RadarrBar

/**
 * Create a loading icon
 */
function createLoadingIcon() {
    const loader = document.createElement('div');
    loader.className = 'loading-icon';

    const container = document.createElement('div');
    container.className = 'loading-icon__cont';
    container.appendChild(loader);

    return container;
}

/**
 * Add checkboxes to all the movies so we can trigger radarr later
 */
async function addCheckboxesToMovies() {
    const {
        item: itemSelector,
        img: imgSelector,
        imdb: imdbSelector,
    } = getImgAndImdbSelectors();
    if (!itemSelector || !imgSelector || !imdbSelector) {
        return false;
    }

    // remove existing checkboxes and ribbons
    Array.from(
        document.querySelectorAll('.ptp-radarr__checkbox, .ptp-radarr__ribbon')
    ).forEach((elem) => elem.remove());

    // get existing imdbIds
    const existingImdbIdObj = await getExistingRadarrImdbIds();
    const existingImdbIds = Object.keys(existingImdbIdObj);

    // get setting on whether we always want to show ribbons or not
    const ribbons = await getConfig('ribbons', false);

    // get radarr url
    const radarrUrl = (await getConfig('host')).replace(/\/$/, '');

    // add checkboxes and ribbons
    let somethingAdded = false;
    Array.from(document.querySelectorAll(itemSelector)).forEach((movieElem) => {
        const imgElem = movieElem.querySelector(imgSelector);
        if (!imgElem) {
            return;
        }

        const imdbElems = Array.from(movieElem.querySelectorAll(imdbSelector));
        const imdbId = imdbElems
            .find((imdbElem) => imdbElem?.href?.match(/tt\d+/)?.[0])
            ?.href?.match(/tt\d+/)?.[0];

        const parent = imgElem.parentNode;
        parent.style.position = 'relative';

        // no imdb id: show a ribbon to the user so they're not confused as to why no checkbox shows up
        if (!imdbId) {
            const ribbon = document.createElement('div');
            ribbon.className = `ptp-radarr__ribbon ${
                ribbons ? 'ptp-radarr__ribbon--always' : ''
            }`;
            ribbon.innerHTML = `<span>No IMDb</span>`;

            parent.appendChild(ribbon);
            return;
        }

        // already added to radarr, ignore!
        if (existingImdbIds.includes(imdbId)) {
            const ribbon = document.createElement('div');
            ribbon.className = `ptp-radarr__ribbon ptp-radarr__ribbon--existing ${
                ribbons ? 'ptp-radarr__ribbon--always' : ''
            }`;
            if (radarrUrl) {
                ribbon.innerHTML = `<a href="${radarrUrl}/movie/${existingImdbIdObj[imdbId]}" rel="noreferrer noopener" target="_blank">In Radarr</a>`;
            }
            else {
                ribbon.innerHTML = `<span>In Radarr</span>`;
            }

            parent.appendChild(ribbon);
            return;
        }

        somethingAdded = true;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'ptp-radarr__checkbox';
        checkbox.className = 'ptp-radarr__checkbox';
        checkbox.value = imdbId;
        checkbox.onchange = () => handleCheckboxChange();

        parent.appendChild(checkbox);
    });

    return somethingAdded;
}

/**
 * Add dropdowns to the radarr bar, based on your radarr configuration
 */
async function populateRadarrBar(radarrBar) {
    // make sure we've successfully connected before
    const hasSuccessfulConnection = await getConfig(
        'hasSuccessfulConnection',
        false
    );
    if (!hasSuccessfulConnection) {
        // eslint-disable-next-line no-param-reassign
        radarrBar.innerHTML = `<div class="loading-icon__cont"><a href="#radarr">Configure and Test</a> your Radarr Connection first</div>`;
        return;
    }

    // no need to query radarr again if we've fully loaded the options before
    if (radarrBar.dataset.isLoaded === '1') {
        return;
    }

    // query radarr for data
    const {
        qualityProfiles,
        rootFolders,
        tags,
        error
    } =
        await getDataForRadarrBar();

    if (error) {
        await setConfig('hasSuccessfulConnection', false);
        // eslint-disable-next-line no-param-reassign
        radarrBar.dataset.isLoaded = '0';
        // eslint-disable-next-line no-param-reassign
        radarrBar.innerHTML = `<div class="loading-icon__cont">Error loading Radarr settings. <a href="#radarr">Recheck your connection</a> or check the browser console for more info</div>`;
        return;
    }

    // get saved settings for the radarr bar
    const settings = getSettings().radarrBar || {};

    // build radarr bar inners
    const qualityProfileOptions = qualityProfiles
        .map(
            (qp) =>
                `<option value="${qp.id}" ${
                    settings.qualityProfileId === qp.id ? 'selected' : ''
                }>${qp.name}</option>`
        )
        .join('');

    const rootFolderOptions = rootFolders
        .map(
            (r) =>
                `<option value="${r.path}" ${
                    settings.rootFolderPath === r.path ? 'selected' : ''
                }>${r.path}</option>`
        )
        .join('');

    let tagsSelected = 0;
    const tagOptions = tags
        .map((tag) => {
            let checked = '';
            if ((settings.tags || []).includes(tag.id)) {
                checked = 'checked';
                tagsSelected += 1;
            }
            return `<label for="multi-select__option-${tag.id}" class="multi-select__option">
        <input type="checkbox" class="multi-select__option-checkbox" id="multi-select__option-${tag.id}" value="${tag.id}" ${checked}> 
        <span class="multi-select__option-text">${tag.label}</span>
      </label>`;
        })
        .join('');

    const numMovies = Array.from(
        document.querySelectorAll('.ptp-radarr__checkbox:checked')
    ).length;

    // eslint-disable-next-line no-param-reassign
    radarrBar.innerHTML = `
  <label class="ptp-radarr__bar-label ptp-radarr__bar-label--right-border" for="ptp-radarr__bar-select-all-none">
    <span class="ptp-radarr__bar-label-text">Select:</span>
    <input type="button" class="ptp-radarr__bar-button" id="ptp-radarr__bar-select-all" value="All">
    <input type="button" class="ptp-radarr__bar-button" id="ptp-radarr__bar-select-none" value="None">
  </label>
  
  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-monitored">
    <span class="ptp-radarr__bar-label-text">Monitor Movie(s)</span>
    <select class="ptp-radarr__bar-select" id="ptp-radarr__bar-monitored" name="monitor">
      <option value="true" ${
        settings.monitor === 'true' ? 'selected' : ''
    }>Monitored</option>
      <option value="false" ${
        settings.monitor === 'false' ? 'selected' : ''
    }>Unmonitored</option>
    </select>
  </label>

  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-qp">
    <span class="ptp-radarr__bar-label-text">Quality Profile</span>
    <select class="ptp-radarr__bar-select" id="ptp-radarr__bar-qp" name="qualityProfileId">
      ${qualityProfileOptions}
    </select>
  </label>

  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-availability">
    <span class="ptp-radarr__bar-label-text">Minimum Availability</span>
    <select class="ptp-radarr__bar-select" id="ptp-radarr__bar-availability" name="minimumAvailability">
      <option value="announced" ${
        settings.minimumAvailability === 'announced' ? 'selected' : ''
    }>Announced</option>
      <option value="inCinemas" ${
        settings.minimumAvailability === 'inCinemas' ? 'selected' : ''
    }>In Cinemas</option>
      <option value="released" ${
        settings.minimumAvailability === 'released' ? 'selected' : ''
    }>Released</option>
    </select>
  </label>

  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-root-folder">
    <span class="ptp-radarr__bar-label-text">Root Folder</span>
    <select class="ptp-radarr__bar-select" id="ptp-radarr__bar-root-folder" name="rootFolderPath">
      ${rootFolderOptions}
    </select>
  </label>

  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-tags">
    <span class="ptp-radarr__bar-label-text">Tags</span>
    <div class="multi-select">
      <div class="multi-select__options">
        ${tagOptions}
      </div>
      <button class="multi-select__button">
        <span class="multi-select__button-icon">☰</span>
        <span class="multi-select__button-text">${tagsSelected} Tag(s)</span>
      </button>
    </div>
  </label>

  <label class="ptp-radarr__bar-label" for="ptp-radarr__bar-search-on-add">
    <span class="ptp-radarr__bar-label-text">Search on Add</span>
    <input type="checkbox" id="ptp-radarr__bar-search-on-add" name="searchForMovie" ${
        settings.searchForMovie === true ? 'checked' : ''
    }>
  </label>

  <label class="ptp-radarr__bar-label ptp-radarr__bar-label--right" for="ptp-radarr__bar-submit">
    <span class="ptp-radarr__bar-label-text ptp-radarr__bar-label-text--selected">
      <span class="ptp-radarr__bar-num-movies--selected">${numMovies}</span> Movie(s) Selected
    </span>
    <span class="ptp-radarr__bar-label-text ptp-radarr__bar-label-text--processed">
      <span class="ptp-radarr__bar-num-movies--processed">0</span> / <span class="ptp-radarr__bar-num-movies--selected">${numMovies}</span> Processed
    </span>
    <span class="ptp-radarr__bar-label-text ptp-radarr__bar-label-text--added">
      <span title="Added"><span class="ptp-radarr__bar-num-movies--added">0</span> 🟢</span> 
      | <span title="Existing"><span class="ptp-radarr__bar-num-movies--existing">0</span> 🟡️</span> 
      | <span title="Errors"><span class="ptp-radarr__bar-num-movies--errored">0</span> 🔴</span> 
    </span>
    <input type="submit" class="ptp-radarr__bar-button" id="ptp-radarr__bar-submit" value="Add Movie(s)" />
  </label>
  `;

    // multi select button
    // open and close menu
    document
        .querySelector('.multi-select__button')
        .addEventListener('click', (event) => {
            event.preventDefault();
            const target = event.target.matches('.multi-select__button') ?
                event.target :
                event.target.parentNode;
            const options = target.previousElementSibling;
            if (options.classList.contains('multi-select__options--opened')) {
                options.classList.remove('multi-select__options--opened');
            }
            else {
                options.classList.add('multi-select__options--opened');
            }
        });

    // multi select checkboxes changed
    Array.from(
        document.querySelectorAll('.multi-select__option-checkbox')
    ).forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const selected = Array.from(
                document.querySelectorAll('.multi-select__option-checkbox:checked')
            );

            // updated how many tags have been selected
            document.querySelector(
                '.multi-select__button-text'
            ).innerHTML = `${selected.length} Tag(s)`;

            // save new settings
            setRadarrBarSetting(
                'tags',
                selected.map((s) => parseInt(s.value, 10))
            );
        });
    });

    // on select change, save the setting to use for next time
    Array.from(document.querySelectorAll('.ptp-radarr__bar-select')).forEach(
        (select) => {
            select.addEventListener('change', (event) => {
                const parsed = parseInt(event.target.value, 10);
                setRadarrBarSetting(
                    select.getAttribute('name'),
                    Number.isNaN(parsed) ? event.target.value : parsed
                );
            });
        }
    );

    // search on add change
    document
        .getElementById('ptp-radarr__bar-search-on-add')
        .addEventListener('change', (event) => {
            setRadarrBarSetting('searchForMovie', event.target.checked);
        });

    // eslint-disable-next-line no-param-reassign
    radarrBar.dataset.isLoaded = '1';
}

/**
 * Add the radarr bar to the page
 */
async function addRadarrBar() {
    const alwaysShow = await getConfig('alwaysShow', false);
    const radarrBar = document.createElement('form');
    radarrBar.className = `ptp-radarr__bar search-bar`;
    radarrBar.method = 'post';
    radarrBar.addEventListener('submit', handleRadarrBarSubmit);
    radarrBar.addEventListener('click', handleRadarrBarClick);
    radarrBar.appendChild(createLoadingIcon());

    const wrapper = document.getElementById('wrapper');
    wrapper.appendChild(radarrBar);

    if (alwaysShow) {
        radarrBar.classList.add('ptp-radarr__bar--showing');
        populateRadarrBar(radarrBar);
    }

    // weird hack to apply a black background color on the default styling
    // don't want to override other stylesheets colors
    const comp = window.getComputedStyle(radarrBar);
    if (comp.getPropertyValue('background-color') === 'rgba(0, 0, 0, 0)') {
        radarrBar.style.backgroundColor = '#000';
    }
}

// ================================= UI Config

/**
 * Close the radarr settings page
 */
function closeRadarrConfig(overlayElem) {
    if (!overlayElem) {
        return;
    }

    overlayElem.remove();
    document.body.style.overflow = 'inherit';
    window.location.hash = '#close';
}

/**
 * Test a connection to Radarr
 */
async function testConnection() {
    const textarea = document.getElementById(
        'ptp-radarr__config-testbox-textarea'
    );

    const host = await getConfig('host');
    const key = await getConfig('key');

    textarea.value = '';

    if (!host || !key) {
        textarea.value += 'Error: Please fill in your host and api key';
        return;
    }

    textarea.value += 'Testing connection ...\n\n';

    try {
        const healthCheck = await radarrGet('/health');
        await setConfig('hasSuccessfulConnection', true);

        if (healthCheck?.length === 0) {
            textarea.value += 'Success! Everything looks good to go\n\n';
        }
        else {
            textarea.value +=
                'Success! Connected to radarr, but there are health issues!\n\n';

            healthCheck.forEach((h) => {
                textarea.value += ` – ${h.message}\n\n`;
            });
        }

        // reloads the radarr bar if needed
        handleCheckboxChange();
        // reload checkboxes
        addCheckboxesToMovies();
    }
    catch (error) {
        textarea.value += `Error: Couldn't connect to radarr. Ensure your host and api key are correct\n\n`;
    }
}

/**
 * Create config container to allow user to configure settings
 */
async function createRadarrConfig() {
    const host = await getConfig('host');
    const key = await getConfig('key');
    const ribbons = await getConfig('ribbons', false);
    const alwaysShow = await getConfig('alwaysShow', false);

    const headerName = await getConfig('headerName', '');
    const headerValue = await getConfig('headerValue', '');

    const {
        body
    } = document;

    const container = document.createElement('div');
    container.className = 'page__main-content ptp-radarr__config-container';
    container.innerHTML = `<div class="search-bar">
  <h3 class="ptp-radarr__config-header">PTP Radarr Configuration</h3>
</div>
<div class="ptp-radarr__config-container-content">
  <div class="ptp-radarr__config-desc">
    The Radarr API Key is attached to the request as a <strong>query string param</strong>. Ensure your Radarr 
    instance is accessible through any firewalls / auth processes you have in place for this.<br /><br />
    Once you click "Test Connection", a new tab should open asking for permission to connect to your Radarr domain.
    Click <strong>"Always Allow Domain"</strong>.<br /><br />
    Please also ensure your <a href="https://passthepopcorn.me/forums.php?action=viewthread&threadid=40322" target="_blank" rel="noreferrer noopener">Radarr instance is secured</a> 
    as per Staff recommendations.
  </div>
  <div class="ptp-radarr__config-testbox">
    <label for="ptp-radarr__config-testbox-textarea" class="ptp-radarr__config-label">
      Test Output
      <textarea id="ptp-radarr__config-testbox-textarea" readonly></textarea>
    </label>
    <input type="button" class="ptp-radarr__config-button--test" value="Test Connection" />
  </div>

  <label for="ptp-radarr__config-host" class="ptp-radarr__config-label">
    Radarr Host: <span class="ptp-radarr__config-label-aside">(inc. port, if applicable)</span>
    <input type="text" class="ptp-radarr__config-input" id="ptp-radarr__config-host" data-config-key="host" placeholder="e.g. https://my.radarr.com or 127.0.0.1:7878" value="${host}" />
  </label>

  <label for="ptp-radarr__config-header-name" class="ptp-radarr__config-label">
    Custom Header:
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;width: 300px;">
      <input type="text" class="ptp-radarr__config-input" id="ptp-radarr__config-header-name" data-config-key="headerName" placeholder="Header Name" value="${headerName || ''}" style="width: 40%; margin-right: 10px;" />
      <input type="text" class="ptp-radarr__config-input" id="ptp-radarr__config-header-value" data-config-key="headerValue" placeholder="Header Value" value="${headerValue || ''}" style="width: max-content;" />
    </div>
  </label>

  <label for="ptp-radarr__config-apikey" class="ptp-radarr__config-label">
    Radarr API Key: <span class="ptp-radarr__config-label-aside">(Settings -> General -> API Key)</span>
    <span class="ptp-radarr__config-input--with-icon">
      <input type="password" class="ptp-radarr__config-input" id="ptp-radarr__config-apikey" data-config-key="key" placeholder="e.g. 5b1008a9ce6f35b4cfa8d5b1e0062401" value="${key}" />
      <span class="ptp-radarr__config-input-icon">🔒</span>
    </span>
  </label>

  <label for="ptp-radarr__config-ribbons" class="ptp-radarr__config-label">
    Always show "In Radarr" and "No IMDb" ribbons:
    <input type="checkbox" class="ptp-radarr__config-checkbox" id="ptp-radarr__config-ribbons" data-config-key="ribbons" ${
        ribbons ? 'checked' : ''
    } />
  </label>

  <label for="ptp-radarr__config-always-show" class="ptp-radarr__config-label">
    Always show Radarr Bar on page load:
    <input type="checkbox" class="ptp-radarr__config-checkbox" id="ptp-radarr__config-always-show" data-config-key="alwaysShow" ${
        alwaysShow ? 'checked' : ''
    } />
  </label>

  <input type="button" class="ptp-radarr__config-button ptp-radarr__config-button--close" value="Close" />
</div>
`;

    const overlay = document.createElement('div');
    overlay.className = 'ptp-radarr__config-overlay';
    overlay.onclick = (e) => {
        if (e.target !== overlay) {
            return;
        }
        closeRadarrConfig(overlay);
    };
    overlay.appendChild(container);

    body.style.overflow = 'hidden';
    body.appendChild(overlay);

    // vars for event listeners
    const textarea = document.getElementById(
        'ptp-radarr__config-testbox-textarea'
    );

    // event listeners

    // host and api key
    Array.from(document.querySelectorAll('.ptp-radarr__config-input')).forEach(
        (inputElem) => {
            const {
                configKey
            } = inputElem.dataset;
            inputElem.addEventListener('change', async (event) => {
                await setConfig(configKey, event.target.value);
                await setConfig('hasSuccessfulConnection', false);
                textarea.value = `Settings changed: Test Connection to continue using script`;
                const radarrBar = document.querySelector('.ptp-radarr__bar');
                radarrBar.dataset.isLoaded = '0';
                handleCheckboxChange();
            });
        }
    );

    // checkboxes
    Array.from(document.querySelectorAll('.ptp-radarr__config-checkbox')).forEach(
        (inputElem) => {
            inputElem.addEventListener('change', async (event) => {
                const {
                    checked
                } = event.target;
                const {
                    configKey
                } = inputElem.dataset;
                await setConfig(configKey, checked);
                // refresh the checkboxes
                addCheckboxesToMovies();
            });
        }
    );

    // close button
    document
        .querySelector('.ptp-radarr__config-button--close')
        ?.addEventListener('click', () => closeRadarrConfig(overlay));

    // test button
    document
        .querySelector('.ptp-radarr__config-button--test')
        ?.addEventListener('click', testConnection);

    // lock / unlock text input
    /* eslint-disable no-param-reassign */
    Array.from(
        document.querySelectorAll('.ptp-radarr__config-input-icon')
    ).forEach((iconElem) => {
        iconElem.addEventListener('click', () => {
            if (iconElem.innerText === '🔒') {
                iconElem.innerText = '🔓';
                iconElem.previousElementSibling.type = 'text';
            }
            else {
                iconElem.innerText = '🔒';
                iconElem.previousElementSibling.type = 'password';
            }
        });
    });
    /* eslint-enable no-param-reassign */
}

/**
 * Open / close settings depending on url hash
 */
function checkOpenSettings() {
    const overlay = document.querySelector('.ptp-radarr__config-overlay');
    if (window.location.hash === '#radarr') {
        if (!overlay) {
            createRadarrConfig();
        }
    }
    else if (overlay) {
        closeRadarrConfig(overlay);
    }
}

/**
 * Create the radarr config tab, under movies
 */
function addRadarrConfigTab() {
    const openSettings = () => {
        window.location.hash = '#radarr';
        checkOpenSettings();
    };

    GM.registerMenuCommand('Open Settings', openSettings, 's');
}

// ================================= Observers

/**
 * Observes pages to see if we need to reload checkboxes
 */
function setupMutationObserver() {
    const {
        item,
        shouldObserveForMutations
    } = getImgAndImdbSelectors();
    if (!shouldObserveForMutations) {
        return;
    }

    const parentNode = document.querySelector(item)?.parentNode;
    if (!parentNode) {
        return;
    }

    // observer config - only interested in tree modifications
    const config = {
        childList: true,
        subtree: true
    };

    // Check modified nodes and add checkboxes if needed
    const callback = (mutationsList) => {
        mutationsList.forEach((mutation) => {
            if (mutation.target === parentNode) {
                addCheckboxesToMovies();
                handleCheckboxChange();
            }
        });
    };

    // create an observer instance with the callback
    const observer = new MutationObserver(callback);

    // Start observing the target node for mutations
    observer.observe(parentNode, config);
}

// ================================= CSS

/**
 * Create our custom style tag
 */
function createStyleTag(styleType) {
    const css = `
/* no styling exists for disabled inputs, so add some */
input[type="submit"]:disabled {
  cursor: not-allowed;
  filter: brightness(0.70);
}

input[type="submit"]:disabled:hover {
  animation: none;
  background: inherit;
  box-shadow: inherit;
}

.multi-select {
  position: relative;
}

.multi-select__options {
  display: none;
  position: absolute;
  bottom: calc(100% + 3px);
  left: 0;
  border: 1px solid #3a4056;
  background: ${
        // eslint-disable-next-line no-nested-ternary
        styleType === 'blue-night'
            ? '#0b0d19;'
            : styleType === 'marcel'
                ? '#232223;'
                : '#fff;'
    }
  border-radius: ${styleType === 'blue-night' ? '5px;' : '2px;'};
  color: ${
        // eslint-disable-next-line no-nested-ternary
        styleType === 'blue-night'
            ? '#949aac;'
            : styleType === 'marcel'
                ? '#fff;'
                : '#000;'
    };
  padding: 0.3rem;
  max-width: 200px;
  max-height: 150px;
  overflow-y: scroll;
  z-index: 101;
}

.multi-select__options--opened {
  display: block;
}

.multi-select__option {
  display: block;
  padding: 3px;
  white-space: nowrap;
  overflow: hidden;
}

.multi-select__option-checkbox {
  display: inline-block;
  vertical-align: middle;
}

.multi-select__option-text {
  display: inline-block;
  vertical-align: middle;
  margin-left: 4px;
}

.multi-select__button {
  border: 1px solid #3a4056;
  background: ${
        // eslint-disable-next-line no-nested-ternary
        styleType === 'blue-night'
            ? '#0b0d19;'
            : styleType === 'marcel'
                ? 'rgba(0, 0, 0, 0.12);'
                : '#fff;'
    }
  border-radius: ${styleType === 'blue-night' ? '5px;' : '2px;'};
  color: ${
        // eslint-disable-next-line no-nested-ternary
        styleType === 'blue-night'
            ? '#949aac;'
            : styleType === 'marcel'
                ? '#fff;'
                : '#000;'
    };
  padding: ${styleType === 'marcel' ? '0.32rem' : '0.42rem'};
  box-shadow: none;
  min-width: 120px;
  max-width: 140px;
  line-height: 1.15;
  font-weight: normal!important;
  text-align: left;
  margin: 0;
  cursor: default;
}

.multi-select__button:hover {
  animation: none;
  cursor: default;
}

.multi-select__button:focus {
  background: ${
        // eslint-disable-next-line no-nested-ternary
        styleType === 'blue-night'
            ? '#0b0d19;'
            : styleType === 'marcel'
                ? 'rgba(0, 0, 0, 0.12);'
                : '#fff;'
    }
  border: 1px solid #3a4056;
  box-shadow: none;
}

.multi-select__button-icon {
  float: right;
  position: relative;
  top: -1px;
}

.loading-icon__cont {
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-icon__cont a {
  padding: 0 5px;
}

.loading-icon {
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #9880ff;
  color: #9880ff;
  animation: dot-flashing 0.75s infinite linear alternate;
  animation-delay: .375s;
}

.loading-icon::before,
.loading-icon::after {
  content: '';
  display: inline-block;
  position: absolute;
  top: 0;
  left: -15px;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: #9880ff;
  color: #9880ff;
  animation: dot-flashing 0.75s infinite alternate;
  animation-delay: 0s;
}

.loading-icon::after {
  left: 15px;
  animation-delay: 0.75s;
}

@keyframes dot-flashing {
  0% {
    background-color: #9880ff;
  }
  50%,
  100% {
    background-color: #ebe6ff;
  }
}

.ptp-radarr__ribbon {
  width: 50px;
  height: 50px;
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s!important;
}

.ptp-radarr__ribbon--always,
.ptp-radarr__ribbon--forced,
*:hover > .ptp-radarr__ribbon {
  opacity: 0.75;
  transition: opacity 0.3s!important;
}

.ptp-radarr__ribbon > a,
.ptp-radarr__ribbon > span {
  position: absolute;
  display: block;
  width: 75px;
  padding: 5px;
  background-color: #3498db;
  box-shadow: 0 5px 10px rgb(0 0 0 / 10%);
  color: #fff;
  text-align: center;
  font-size: 6px;
  right: -2px;
  top: 6px;
  transform: rotate(-45deg);
}

.ptp-radarr__ribbon--existing > a,
.ptp-radarr__ribbon--existing > span {
  background-color: red;
}

.ptp-radarr__checkbox {
  position: absolute!important;
  top: 2px;
  left: 2px;
  opacity: 0;
  transition: opacity 0.3s!important;
}

.ptp-radarr__checkbox--forced,
.ptp-radarr__checkbox:checked,
*:hover > .ptp-radarr__checkbox {
  opacity: 1;
  transition: opacity 0.3s!important;
}

/* this overwrites some styles in search bar */
.ptp-radarr__bar {
  background-color: #2f3447 !important;
  display: block;
  position: fixed;
  bottom: 0;
  left: 50%;
  max-width: 1140px;
  width: 100%;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  font-size: 12px;
  text-align: left;
  padding: 0;
  transform: translate(-50%, 100%);
  transition: transform 0.5s;
  z-index: 3; /* over the reply bar, if also using infinite scroll script */
  ${styleType === 'marcel' ? 'background-color: #242424f5;' : ''}
}

.ptp-radarr__bar--showing {
  transform: translate(-50%, 0%);
  transition: transform 0.5s;
}

.ptp-radarr__bar-label {
  display: inline-block;
  vertical-align: top;
  padding: 10px 9px;
}

.ptp-radarr__bar-label--right-border {
  border-right: 1px dashed rgba(0, 0, 0, 0.5);
}

.ptp-radarr__bar-label--right {
  float: right;
  text-align: center;
}

.ptp-radarr__bar-label-text {
  display: block;
  margin-bottom: 5px;
}

.ptp-radarr__bar-label-text--processed,
.ptp-radarr__bar-label-text--added {
  display: none;
}

.ptp-radarr__bar-button {
  padding: 0.3rem;
}

#ptp-radarr__bar-submit {
  min-width: 120px;
}

.ptp-radarr__bar-select {
  min-width: 120px;
  max-width: 140px;
  padding: 0.3rem;
}

#ptp-radarr__bar-search-on-add {
  width: 29px;
  height: 29px;
}

#ptp-radarr__bar-search-on-add:after {
  width: 10px;
  height: 15px;
  left: 9px;
  top: 3px;
}

.ptp-radarr__config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 100;
}

.ptp-radarr__config-container {
  width: 550px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  border-radius: 10px;
  padding: 0;
  ${styleType === 'marcel' ? 'background-color: #1c1c1c;' : ''}
}

.ptp-radarr__config-container .search-bar {
  width: auto;
}

.ptp-radarr__config-container-content {
  padding: 15px;
}

.ptp-radarr__config-header {
  margin: 5px 0;
  text-align: center;
  ${styleType === 'marcel' ? 'padding-top: 10px;' : ''}
}

.ptp-radarr__config-desc {
  margin-bottom: 10px;
  filter: brightness(85%);
  padding-bottom: 15px;
  border-bottom: 1px dashed #999;
}

.ptp-radarr__config-testbox {
  float: right;
  width: 200px;
}

#ptp-radarr__config-testbox-textarea {
  display: block;
  margin-top: 5px;
  width: 100%;
  height: 205px;
  font-family: monospace;
  font-size: 10px;
}

.ptp-radarr__config-label {
  display: block;
  padding: 8px 0;
}

.ptp-radarr__config-label-aside {
  color: #ccc;
  font-size: 10px;
  padding-left: 5px;
}

.ptp-radarr__config-input {
  display: block; 
  margin-top: 5px;
  width: 300px;
}

.ptp-radarr__config-input-icon {
  position: absolute;
  top: 7px;
  right: 6px;
  font-size: 16px;
}

.ptp-radarr__config-input--with-icon {
  position: relative;
  display: inline-block;
}

.ptp-radarr__config-checkbox {
  margin-top: 5px!important;
  display: block!important;
}

.ptp-radarr__config-button {
  margin-top: 10px!important;
}`;

    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));

    document.head.appendChild(style);
}

// ================================= Main Runner

(async function run() {
    createStyleTag(getTheme());
    addRadarrConfigTab();

    // make sure we can add a checkbox to at least one item on the page, before rendering the other things
    const addedCheckboxes = await addCheckboxesToMovies();
    if (addedCheckboxes) {
        addRadarrBar();

        setupMutationObserver();

        window.addEventListener('hashchange', checkOpenSettings);
        checkOpenSettings();
    }
})();
