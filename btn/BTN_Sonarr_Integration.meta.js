// ==UserScript==
// @name         BTN Sonarr Integration
// @namespace    https://openuserjs.org/users/SB100
// @description  The BTN <-> Sonarr Integration we always wanted (Modded by BEY0NDER for BTN FDC Theme and Custom Headers)
// @updateURL    https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/btn/BTN_Sonarr_Integration.meta.js
// @downloadURL  https://raw.githubusercontent.com/4n0n3000/pt-scripts/main/btn/BTN_Sonarr_Integration.meta.js
// @version      1.0.4-BEY0NDER
// @author       SB100
// @copyright    2025, SB100 (https://openuserjs.org/users/SB100)
// @license      MIT
// @match        https://broadcasthe.net/series.php?id=*
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @connect      thetvdb.com
// @icon	     https://broadcasthe.net/favicon.ico

// ==/UserScript==

// ==OpenUserJS==
// @author SB100
// ==/OpenUserJS==

/* jshint esversion: 11 */

/**
 * =============================
 * ADVANCED OPTIONS
 * =============================
 */

// show debug logs in the browser console
const SETTING_DEBUG = false;

// how long to cache sonarr existing series for
// default = 1000 * 60 * 10 = 10 minutes
const SETTING_CACHE_TIME = 1000 * 60 * 10;

/**
 * =============================
 * END ADVANCED OPTIONS
 * DO NOT MODIFY BELOW THIS LINE
 * =============================
 */

// ================================= Basics

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
        `[BTN Sonarr Integration] ${
            Array.isArray(strOrStrArray) ? strOrStrArray.join(' - ') : strOrStrArray
        }`
    );
}

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
    const settings = window.localStorage.getItem('sonarrIntegrationSettings');
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
        'sonarrIntegrationSettings',
        JSON.stringify(json)
    );
}

/**
 * Set a sonarr bar setting into the settings localStorage object
 */
function setSonarrBarSetting(type, value) {
    const existingSettings = getSettings().sonarrBar || {};
    const newSettings = {
        ...existingSettings,
        [type]: value
    };
    setSetting('sonarrBar', newSettings);
}

// ================================= Query

/**
 * Query the sonarr api
 */
async function query(url, method = 'get', params = {}, sonarrApiKey = null, customHeaders = {}) {
    let resolver;
    let rejecter;
    const p = new Promise((resolveFn, rejectFn) => {
        resolver = resolveFn;
        rejecter = rejectFn;
    });

    const clonedUrl = new URL(url);

    const obj = {
        method,
        timeout: 60000,
        onload: (response) => resolver(response),
        onerror: (response) => rejecter(response),
    };

    if (method === 'post') {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders, // Add custom headers
        };

        if (sonarrApiKey) {
            clonedUrl.search = new URLSearchParams({
                apikey: sonarrApiKey,
            }).toString();
        }

        const final = Object.assign(obj, {
            url: clonedUrl.toString(),
            headers,
            data: JSON.stringify(params),
        });

        GM.xmlHttpRequest(final);
    }
    else {
        const searchParams = new URLSearchParams();

        if (sonarrApiKey) {
            searchParams.append('apikey', sonarrApiKey);
        }

        for (const [key, value] of Object.entries(params)) {
            searchParams.append(key, value);
        }

        clonedUrl.search = searchParams.toString();

        const final = Object.assign(obj, {
            url: clonedUrl.toString(),
            headers: customHeaders, // Add custom headers for GET requests too
        });

        GM.xmlHttpRequest(final);
    }

    return p;
}

/**
 * Get request to Sonarr API. Parse results
 */
async function sonarrGet(path, params = {}) {
    const sonarrUrl = (await getConfig('host')).replace(/\/$/, '');
    const apiKey = await getConfig('key');
    const url = `${sonarrUrl}/api/v3`;
    const headerName = await getConfig('headerName', '');
    const headerValue = await getConfig('headerValue', '');
    const headerName2 = await getConfig('headerName2', '');
    const headerValue2 = await getConfig('headerValue2', '');

    const customHeaders = {};
    if (headerName && headerValue) {
        customHeaders[headerName] = headerValue;
    }
    if (headerName2 && headerValue2) {
        customHeaders[headerName2] = headerValue2;
    }


    return query(new URL(`${url}${path}`), 'get', params, apiKey, customHeaders).then(
        (response) => JSON.parse(response.responseText)
    );
}

/**
 * Post request to Sonarr API. Parse results
 */
async function sonarrPost(path, params = {}) {
    const sonarrUrl = (await getConfig('host')).replace(/\/$/, '');
    const apiKey = await getConfig('key');
    const url = `${sonarrUrl}/api/v3`;
    const headerName = await getConfig('headerName', '');
    const headerValue = await getConfig('headerValue', '');

    const customHeaders = {};
    if (headerName && headerValue) {
        customHeaders[headerName] = headerValue;
    }


    return query(new URL(`${url}${path}`), 'post', params, apiKey, customHeaders).then(
        (response) => JSON.parse(response.responseText)
    );
}

/**
 * Either parse the tvdb id from the url, or query the page for it
 */
async function tvdbGetIdFromUrl(tvdbUrl) {
    const url = new URL(tvdbUrl);

    // for format: https://thetvdb.com/?tab=series&id=
    if (url.searchParams.get('id') !== null) {
        return url.searchParams.get('id');
    }

    // for format: https://www.thetvdb.com/series
    return query(url).then((response) => {
        const parser = new DOMParser();
        const html = parser.parseFromString(response.responseText, 'text/html');
        return (
            html.querySelector('#series_basic_info li span')?.textContent ?? null
        );
    });
}

/**
 * Get existing tvdb ids from sonarr, and cache for the appropriate time
 */
async function getExistingSonarrTvdbIds() {
    try {
        const {
            sonarrTvdbIds,
            lastUpdated
        } = getSettings();

        if (
            !lastUpdated ||
            new Date().getTime() > lastUpdated + SETTING_CACHE_TIME
        ) {
            const hasSuccessfulConnection = await getConfig(
                'hasSuccessfulConnection',
                false
            );
            if (!hasSuccessfulConnection) {
                return [];
            }

            const allSeries = await sonarrGet('/series');
            const tvdbIds = allSeries.reduce((result, series) => {
                // eslint-disable-next-line no-param-reassign
                result[series.tvdbId] = series.titleSlug;
                return result;
            }, {});

            setSetting('lastUpdated', new Date().getTime());
            setSetting('sonarrTvdbIds', tvdbIds);

            return tvdbIds;
        }

        return sonarrTvdbIds;
    }
    catch (e) {
        await setConfig('hasSuccessfulConnection', false);
        // TODO update for sonarr
        // const sonarrBar = document.querySelector('.btn-sonarr__bar');
        // sonarrBar.dataset.isLoaded = '0';
        // debug([`Couldn't get existing IMDb IDs from Radarr`, e.message]);
        return [];
    }
}

/**
 * Get the data needed to populate the sonarr bar
 */
async function getDataForSonarrBar() {
    try {
        const [rootFolders, qualityProfiles, tags] = await Promise.all([
            sonarrGet('/rootfolder'),
            sonarrGet('/qualityprofile'),
            sonarrGet('/tag'),
        ]);

        return {
            rootFolders,
            qualityProfiles,
            tags,
        };
    }
    catch (e) {
        debug([`Couldn't connect to Sonarr`, e.message]);
        return {
            error: true,
        };
    }
}

// ================================= Helpers

/**
 * Tries to get the theme the user is using
 */
function getTheme() {
    const linkTags = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
    );

    for (let i = 0, len = linkTags.length; i < len; i += 1) {
        const tag = linkTags[i];
        if (tag.href.includes('btn-future.css')) {
            return 'btn-future';
        }
    }

    return 'default';
}

/**
 * Get the BTN series id from the url
 */
function getBtnSeriesIdFromUrl() {
    if (window.location.pathname !== '/series.php') {
        debug(
            `Could not find BTN series ID from URL: "${window.location.toString()}"`
        );
        return null;
    }

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') ?? null;
}

/**
 * Get a tvdb id from the BTN id that has been saved in settings
 */
function getTvdbIdFromBtnId(btnId) {
    const {
        btnToTvdbMap = {}
    } = getSettings();
    return btnToTvdbMap[btnId];
}

/**
 * Save a BTN -> tvdb Id mapping
 */
function setTvdbIdForBtnId(btnId, tvdbId) {
    const {
        btnToTvdbMap = {}
    } = getSettings();
    btnToTvdbMap[btnId] = tvdbId;
    setSetting('btnToTvdbMap', btnToTvdbMap);
}

/**
 * Get the tvdb url from the BTN series page
 */
function getTvdbUrlFromBtnSeriesPage() {
    if (window.location.pathname !== '/series.php') {
        debug(`Could not find tvdb URL from URL: "${window.location.toString()}"`);
        return null;
    }

    const a = document.querySelector(
        '[href*="thetvdb.com/series"], [href*="thetvdb.com/?tab=series&id="]'
    );
    return a?.href ?? null;
}

/**
 * All encompassing function to find the tvdb id from a BTN series page
 */
async function getTvdbId() {
    const btnId = getBtnSeriesIdFromUrl();
    const maybeLocalTvdbId = getTvdbIdFromBtnId(btnId);
    if (maybeLocalTvdbId) {
        debug(`tvdb ID exists locally [BTN: ${btnId}] [tvdb: ${maybeLocalTvdbId}]`);
        return maybeLocalTvdbId;
    }

    const tvdbUrl = getTvdbUrlFromBtnSeriesPage();
    if (!tvdbUrl) {
        debug(
            `Could not obtain tvdb URL from BTN series page: "${window.location.toString()}"`
        );
        return null;
    }

    const maybeRemoteTvdbId = await tvdbGetIdFromUrl(tvdbUrl);
    const asInt = Number.parseInt(maybeRemoteTvdbId, 10);
    if (Number.isNaN(asInt)) {
        debug(
            `Could not obtain tvdb ID from remote for URL: "${window.location.toString()}"`
        );
        return null;
    }

    debug(`tvdb ID obtained remotely [BTN: ${btnId}] [tvdb: ${asInt}]`);
    setTvdbIdForBtnId(btnId, asInt);
    return asInt;
}

// ================================= Event Handlers

/**
 * Force Sonarr Bar to show if the state of a checkbox is changed
 */
function handleCheckboxChange() {
    const sonarrBar = document.querySelector('.btn-sonarr__bar');

    const allCheckboxes = Array.from(
        document.querySelectorAll('.btn-sonarr__checkbox')
    );

    if (allCheckboxes.some((checkbox) => checkbox.checked)) {
        if (!sonarrBar.classList.contains('btn-sonarr__bar--showing')) {
            sonarrBar.classList.add('btn-sonarr__bar--showing');
        }

        // if it hasn't been already, add dropdowns to the sonarr bar
        // eslint-disable-next-line no-use-before-define
        populateSonarrBar(sonarrBar);
    }
    else if (sonarrBar.classList.contains('btn-sonarr__bar--showing')) {
        sonarrBar.classList.remove('btn-sonarr__bar--showing');
    }
}

/**
 * Close the Multiselect options if we have it open, and we click outside of it on the sonarr bar
 */
function handleSonarrBarClick(event) {
    const multiSelectOptions = document.querySelector('.multi-select__options');

    // if options is opened, and we click outside the multi-select, close options
    if (
        multiSelectOptions &&
        multiSelectOptions.classList.contains('multi-select__options--opened')
    ) {
        const targetSelector = '.multi-select';
        let {
            target
        } = event;

        while (target && target.matches('.btn-sonarr__bar') === false) {
            if (target.matches(targetSelector)) {
                return;
            }

            target = target.parentNode;
        }

        multiSelectOptions.classList.remove('multi-select__options--opened');
    }
}

/**
 * Add the series to sonarr with the selected options
 */
async function handleSonarrBarSubmit(event) {
    event.preventDefault();

    const addSeriesButton = document.getElementById('btn-sonarr__bar-submit');

    // if errored, and form is submitted, reset the form
    if (event.target.dataset.reset === '1') {
        // eslint-disable-next-line no-param-reassign
        event.target.dataset.reset = '0';
        addSeriesButton.value = 'Add Series';
        return;
    }

    // disable the button
    addSeriesButton.value = 'Processing …';
    addSeriesButton.disabled = true;
    // eslint-disable-next-line no-param-reassign
    event.target.dataset.reset = '1';

    // get the form data
    const sonarrBarFormData = Object.fromEntries(
        Array.from(new FormData(event.target))
    );

    try {
        const tvdbId = parseInt(
            document.querySelector('.btn-sonarr__checkbox:checked')?.value,
            10
        );
        if (Number.isNaN(tvdbId)) {
            addSeriesButton.disabled = false;
            addSeriesButton.value = 'Nothing selected';
            return;
        }

        const tagIds = Array.from(
            document.querySelectorAll('.multi-select__option-checkbox:checked')
        ).map((c) => parseInt(c.value, 10));

        const seriesInfos = await sonarrGet('/series/lookup', {
            term: `tvdb:${tvdbId}`,
        });
        if (!Array.isArray(seriesInfos) || seriesInfos.length !== 1) {
            addSeriesButton.disabled = false;
            addSeriesButton.value = 'Invalid TVDb info';
            return;
        }

        const addBody = {
            ...seriesInfos[0],
            alternateTitles: [],
            addOptions: {
                ignoreEpisodesWithFiles: false,
                ignoreEpisodesWithoutFiles: false,
                searchForCutoffUnmetEpisodes: sonarrBarFormData.searchCutoffUnmetEpisodes === 'on',
                searchForMissingEpisodes: sonarrBarFormData.searchMissingEpisodes === 'on',
                monitor: sonarrBarFormData.monitor,
            },
            monitored: sonarrBarFormData.monitor !== 'none',
            tags: tagIds,
            rootFolderPath: sonarrBarFormData.rootFolderPath,
            qualityProfileId: parseInt(sonarrBarFormData.qualityProfileId, 10),
            seasonFolder: sonarrBarFormData.seasonFolder === 'on',
            path: `${sonarrBarFormData.rootFolderPath}/${seriesInfos[0].folder}`,
            added: new Date().toISOString(),
        };
        delete addBody.folder;
        delete addBody.remotePoster;

        addSeriesButton.value = 'Adding …';

        const addResult = await sonarrPost('/series', addBody);
        if (addResult.errors) {
            addSeriesButton.value = 'Error adding series';
            debug(['Error importing series', addResult.errors.$]);
            setSetting('lastUpdated', 0);
            setSetting('sonarrTvdbIds', {});
            return;
        }

        addSeriesButton.value = 'Added!';

        // update cache
        const {
            sonarrTvdbIds
        } = getSettings();
        setSetting('sonarrTvdbIds', {
            ...sonarrTvdbIds,
            [addResult.tvdbId]: addResult.titleSlug,
        });

        // refresh the checkboxes to show the new ribbons
        // eslint-disable-next-line no-use-before-define
        await addCheckboxesToSeries();
    }
    catch (e) {
        await setConfig('hasSuccessfulConnection', false);
        const sonarrBar = document.querySelector('.btn-sonarr__bar');
        sonarrBar.dataset.isLoaded = '0';
        sonarrBar.innerHTML = `<div class="loading-icon__cont">Error adding to Sonarr. <a href="#sonarr">Recheck your connection</a> or check your browser console for more info</div>`;
        debug([`Couldn't import series`, e.message]);
        return;
    }

    addSeriesButton.disabled = false;
}

// ================================= UI Sonarr Bar

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
 * Grab all contents needed to populate the sonarr bar, and render it
 */
async function populateSonarrBar(sonarrBar) {
    // make sure we've successfully connected before
    const hasSuccessfulConnection = await getConfig(
        'hasSuccessfulConnection',
        false
    );
    if (!hasSuccessfulConnection) {
        // eslint-disable-next-line no-param-reassign
        sonarrBar.innerHTML = `<div class="loading-icon__cont"><a href="#sonarr">Configure and Test</a> your Sonarr Connection first</div>`;
        return;
    }

    // no need to query sonarr again if we've fully loaded the options before
    if (sonarrBar.dataset.isLoaded === '1') {
        return;
    }

    // query sonarr for data
    const {
        qualityProfiles,
        rootFolders,
        tags,
        error
    } =
        await getDataForSonarrBar();

    if (error) {
        await setConfig('hasSuccessfulConnection', false);
        // eslint-disable-next-line no-param-reassign
        sonarrBar.dataset.isLoaded = '0';
        // eslint-disable-next-line no-param-reassign
        sonarrBar.innerHTML = `<div class="loading-icon__cont">Error loading Sonarr settings. <a href="#sonarr">Recheck your connection</a> or check the browser console for more info</div>`;
        return;
    }

    // get saved settings for the sonarr bar
    const settings = getSettings().sonarrBar || {};

    // build sonarr bar inners
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

    // eslint-disable-next-line no-param-reassign
    sonarrBar.innerHTML = `
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-root-folder">
    <span class="btn-sonarr__bar-label-text">Root Folder</span>
    <select class="btn-sonarr__bar-select" id="btn-sonarr__bar-root-folder" name="rootFolderPath">
      ${rootFolderOptions}
    </select>
  </label>
  
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-monitor">
    <span class="btn-sonarr__bar-label-text">Monitor</span>
    <select class="btn-sonarr__bar-select" id="btn-sonarr__bar-monitor" name="monitor">
      <option value="all" ${
        settings.monitor === 'all' ? 'selected' : ''
    }>All Episodes</option>
      <option value="future" ${
        settings.monitor === 'future' ? 'selected' : ''
    }>Future Episodes</option>
      <option value="missing" ${
        settings.monitor === 'missing' ? 'selected' : ''
    }>Missing Episodes</option>
      <option value="existing" ${
        settings.monitor === 'existing' ? 'selected' : ''
    }>Existing Episodes</option>
      <option value="recent" ${
        settings.monitor === 'recent' ? 'selected' : ''
    }>Recent Episodes</option>
      <option value="pilot" ${
        settings.monitor === 'pilot' ? 'selected' : ''
    }>Pilot Episodes</option>
      <option value="firstSeason" ${
        settings.monitor === 'firstSeason' ? 'selected' : ''
    }>First Season</option>
      <option value="lastSeason" ${
        settings.monitor === 'lastSeason' ? 'selected' : ''
    }>Last Season</option>
      <option value="monitorSpecials" ${
        settings.monitor === 'monitorSpecials' ? 'selected' : ''
    }>Monitor Specials</option>
      <option value="unmonitorSpecials" ${
        settings.monitor === 'unmonitorSpecials' ? 'selected' : ''
    }>Unmonitor Specials</option>
      <option value="none" ${
        settings.monitor === 'none' ? 'selected' : ''
    }>None</option>
    </select>
  </label>
  
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-qp">
    <span class="btn-sonarr__bar-label-text">Quality Profile</span>
    <select class="btn-sonarr__bar-select" id="btn-sonarr__bar-qp" name="qualityProfileId">
      ${qualityProfileOptions}
    </select>
  </label>
  
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-series-type">
    <span class="btn-sonarr__bar-label-text">Series Type</span>
    <select class="btn-sonarr__bar-select" id="btn-sonarr__bar-series-type" name="seriesType">
      <option value="standard" ${
        settings.seriesType === 'standard' ? 'selected' : ''
    }>Standard</option>
      <option value="daily" ${
        settings.seriesType === 'daily' ? 'selected' : ''
    }>Daily / Date</option>
      <option value="anime" ${
        settings.seriesType === 'anime' ? 'selected' : ''
    }>Anime / Absolute</option>
    </select>
  </label>
  
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-tags">
    <span class="btn-sonarr__bar-label-text">Tags</span>
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
  
  <span class="btn-sonarr__bar-label">
    <span class="btn-sonarr__bar-label-text">Create</span>
    <span class="btn-sonarr__bar-multi-label">
      <label for="btn-sonarr__bar-season-folder">
        <input type="checkbox" class="btn-sonarr__bar-checkbox" id="btn-sonarr__bar-season-folder" name="seasonFolder" ${
        settings.seasonFolder === true ? 'checked' : ''
    }>
        Season folder
      </label>
    </span>
  </span>
  
  <span class="btn-sonarr__bar-label">
    <span class="btn-sonarr__bar-label-text">Search for</span>
    <span class="btn-sonarr__bar-multi-label">
      <label for="btn-sonarr__bar-search-missing-episodes">
        <input type="checkbox" class="btn-sonarr__bar-checkbox" id="btn-sonarr__bar-search-missing-episodes" name="searchMissingEpisodes" ${
        settings.searchMissingEpisodes === true ? 'checked' : ''
    }>
        Missing
      </label>
      
      <label for="btn-sonarr__bar-search-cutoff-unmet-episodes">
        <input type="checkbox" class="btn-sonarr__bar-checkbox" id="btn-sonarr__bar-search-cutoff-unmet-episodes" name="searchCutoffUnmetEpisodes" ${
        settings.searchCutoffUnmetEpisodes === true ? 'checked' : ''
    }>
        Cutoff unmet
      </label>
    </span>
  </span>
  
  <label class="btn-sonarr__bar-label" for="btn-sonarr__bar-submit">
    <span class="btn-sonarr__bar-label-text">Add Series</span>
    <input type="submit" class="btn-sonarr__bar-button" id="btn-sonarr__bar-submit" value="Add Series" />
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
            setSonarrBarSetting(
                'tags',
                selected.map((s) => parseInt(s.value, 10))
            );
        });
    });

    // on select change, save the setting to use for next time
    Array.from(document.querySelectorAll('.btn-sonarr__bar-select')).forEach(
        (select) => {
            select.addEventListener('change', (event) => {
                const parsed = parseInt(event.target.value, 10);
                setSonarrBarSetting(
                    select.getAttribute('name'),
                    Number.isNaN(parsed) ? event.target.value : parsed
                );
            });
        }
    );

    // on checkbox change, save the setting to use for next time
    Array.from(document.querySelectorAll('.btn-sonarr__bar-checkbox')).forEach(
        (checkbox) => {
            checkbox.addEventListener('change', (event) => {
                const {
                    checked
                } = event.target;
                setSonarrBarSetting(checkbox.getAttribute('name'), checked);
            });
        }
    );

    // eslint-disable-next-line no-param-reassign
    sonarrBar.dataset.isLoaded = '1';
}

/**
 * Add the sonarr bar to the page
 */
async function addSonarrBar() {
    const alwaysShow = await getConfig('alwaysShow', false);
    const sonarrBar = document.createElement('form');
    sonarrBar.className = `btn-sonarr__bar`;
    sonarrBar.method = 'post';
    sonarrBar.addEventListener('submit', handleSonarrBarSubmit);
    sonarrBar.addEventListener('click', handleSonarrBarClick);
    sonarrBar.appendChild(createLoadingIcon());

    const wrapper = document.getElementById('wrapper');
    wrapper.appendChild(sonarrBar);

    if (alwaysShow) {
        sonarrBar.classList.add('btn-sonarr__bar--showing');
        populateSonarrBar(sonarrBar);
    }
}

// ================================= UI Checkboxes

/**
 * Add checkboxes to the series posters
 */
async function addCheckboxesToSeries() {
    // remove existing checkboxes and ribbons
    Array.from(
        document.querySelectorAll('.btn-sonarr__checkbox, .btn-sonarr__ribbon')
    ).forEach((elem) => elem.remove());

    // get setting on whether we always want to show ribbons or not
    const ribbons = await getConfig('ribbons', false);
    // get sonarr url
    const sonarrUrl = (await getConfig('host')).replace(/\/$/, '');

    // find img poster
    const imgElem = document.querySelector('.sidebar img[onload]');
    if (!imgElem) {
        debug(`Could not find cover poster for "${window.location.toString()}"`);
        return false;
    }

    const parent = imgElem.parentNode;
    parent.style.position = 'relative';

    // add a loader whilst we do the api calls
    const loader = createLoadingIcon();
    loader.style.position = 'absolute';
    loader.style.inset = 0;
    parent.appendChild(loader);

    // get current tvdbId, and all existing ones in sonarr
    const [tvdbId, existingTvdbIdObj] = await Promise.all([
        getTvdbId(),
        getExistingSonarrTvdbIds(),
    ]);
    const existingTvdbIds = Object.keys(existingTvdbIdObj);

    // remove the loader
    loader.remove();

    // add checkboxes / ribbons
    // couldn't parse tvdb id from somewhere
    if (!tvdbId) {
        const ribbon = document.createElement('div');
        ribbon.className = `btn-sonarr__ribbon ${
            ribbons ? 'btn-sonarr__ribbon--always' : ''
        }`;
        ribbon.innerHTML = `<span>No tvdb</span>`;

        parent.appendChild(ribbon);
        return false;
    }

    // already added to sonarr, ignore!
    if (existingTvdbIds.includes(tvdbId.toString())) {
        const ribbon = document.createElement('div');
        ribbon.className = `btn-sonarr__ribbon btn-sonarr__ribbon--existing ${
            ribbons ? 'btn-sonarr__ribbon--always' : ''
        }`;
        if (sonarrUrl) {
            ribbon.innerHTML = `<a href="${sonarrUrl}/series/${existingTvdbIdObj[tvdbId]}" rel="noreferrer noopener" target="_blank">In Sonarr</a>`;
        }
        else {
            ribbon.innerHTML = `<span>In Sonarr</span>`;
        }

        parent.appendChild(ribbon);
        return false;
    }

    const alwaysShow = await getConfig('alwaysShow', false);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'btn-sonarr__checkbox';
    checkbox.className = 'btn-sonarr__checkbox';
    checkbox.value = tvdbId;
    checkbox.checked = alwaysShow;
    checkbox.onchange = () => handleCheckboxChange();

    parent.appendChild(checkbox);

    return true;
}

// ================================= UI Config

/**
 * Close the sonarr settings page
 */
function closeSonarrConfig(overlayElem) {
    if (!overlayElem) {
        return;
    }

    overlayElem.remove();
    document.body.style.overflow = 'inherit';
    window.location.hash = '#close';
}

/**
 * Test a connection to Sonarr
 */
async function testConnection() {
    const textarea = document.getElementById(
        'btn-sonarr__config-testbox-textarea'
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
        const healthCheck = await sonarrGet('/health');
        await setConfig('hasSuccessfulConnection', true);

        if (healthCheck?.length === 0) {
            textarea.value += 'Success! Everything looks good to go\n\n';
        }
        else {
            textarea.value +=
                'Success! Connected to sonarr, but there are health issues!\n\n';

            healthCheck.forEach((h) => {
                textarea.value += ` – ${h.message}\n\n`;
            });
        }

        // TODO: reloads the sonarr bar if needed
        handleCheckboxChange();
        // TODO: reload checkboxes
        addCheckboxesToSeries();
    }
    catch (error) {
        textarea.value += `Error: Couldn't connect to sonarr. Ensure your host and api key are correct\n\n`;
    }
}

/**
 * Create config container to allow user to configure settings
 */
async function createSonarrConfig() {
    const host = await getConfig('host');
    const key = await getConfig('key');
    const ribbons = await getConfig('ribbons', false);
    const alwaysShow = await getConfig('alwaysShow', false);

    const headerName = await getConfig('headerName', '');
    const headerValue = await getConfig('headerValue', '');
    const headerName2 = await getConfig('headerName', '');
    const headerValue2 = await getConfig('headerValue', '');

    const {
        body
    } = document;

    const container = document.createElement('div');
    container.className = 'btn-sonarr__config-container';
    container.innerHTML = `<div class="btn-sonarr__config-header">
  <h3>BTN Sonarr Configuration</h3>
</div>
<div class="btn-sonarr__config-container-content">
  <div class="btn-sonarr__config-desc">
    The Sonarr API Key is attached to the request as a <strong>query string param</strong>. Ensure your Sonarr 
    instance is accessible through any firewalls / auth processes you have in place for this.<br /><br />
    Once you click "Test Connection", a new tab should open asking for permission to connect to your Sonarr domain.
    Click <strong>"Always Allow Domain"</strong>.
  </div>
  <div class="btn-sonarr__config-testbox">
    <label for="btn-sonarr__config-testbox-textarea" class="btn-sonarr__config-label">
      Test Output
      <textarea id="btn-sonarr__config-testbox-textarea" readonly></textarea>
    </label>
    <input type="button" class="btn-sonarr__config-button--test" value="Test Connection" />
  </div>

  <label for="btn-sonarr__config-host" class="btn-sonarr__config-label">
    Sonarr Host: <span class="btn-sonarr__config-label-aside">(inc. port, if applicable)</span>
    <input type="text" class="btn-sonarr__config-input" id="btn-sonarr__config-host" data-config-key="host" placeholder="e.g. https://my.sonarr.com or 127.0.0.1:8989" value="${host}" />
  </label>
  
  <label for="btn-sonarr__config-header-name" class="btn-sonarr__config-label">
    Custom Headers:
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;width: 340px;">
      <input type="text" class="btn-sonarr__config-input" id="btn-sonarr__config-header-name" data-config-key="headerName" placeholder="Header Name" value="${headerName || ''}" style="width: 40%; margin-right: 10px;" />
      <input type="text" class="btn-sonarr__config-input" id="btn-sonarr__config-header-value" data-config-key="headerValue" placeholder="Header Value" value="${headerValue || ''}" style="width: 60%;" />
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;width: 340px;">
      <input type="text" class="btn-sonarr__config-input" id="btn-sonarr__config-header-name2" data-config-key="headerName2" placeholder="Header Name" value="${headerName2 || ''}" style="width: 40%; margin-right: 10px;" />
      <input type="text" class="btn-sonarr__config-input" id="btn-sonarr__config-header-value2" data-config-key="headerValue2" placeholder="Header Value" value="${headerValue2 || ''}" style="width: 60%;" />
    </div>
  </label>

  <label for="btn-sonarr__config-apikey" class="btn-sonarr__config-label">
    Sonarr API Key: <span class="btn-sonarr__config-label-aside">(Settings -> General -> API Key)</span>
    <span class="btn-sonarr__config-input--with-icon">
      <input type="password" class="btn-sonarr__config-input" id="btn-sonarr__config-apikey" data-config-key="key" placeholder="e.g. 5b1008a9ce6f35b4cfa8d5b1e0062401" value="${key}" />
      <span class="btn-sonarr__config-input-icon">🔒</span>
    </span>
  </label>

  <label for="btn-sonarr__config-ribbons" class="btn-sonarr__config-label">
    Always show "In Sonarr" and "No tvdb" ribbons:
    <input type="checkbox" class="btn-sonarr__config-checkbox" id="btn-sonarr__config-ribbons" data-config-key="ribbons" ${
        ribbons ? 'checked' : ''
    } />
  </label>

  <label for="btn-sonarr__config-always-show" class="btn-sonarr__config-label">
    Always show Sonarr Bar on page load:
    <input type="checkbox" class="btn-sonarr__config-checkbox" id="btn-sonarr__config-always-show" data-config-key="alwaysShow" ${
        alwaysShow ? 'checked' : ''
    } />
  </label>

  <input type="button" class="btn-sonarr__config-button btn-sonarr__config-button--close" value="Close" />
</div>
`;

    const overlay = document.createElement('div');
    overlay.className = 'btn-sonarr__config-overlay';
    overlay.onclick = (e) => {
        if (e.target !== overlay) {
            return;
        }
        closeSonarrConfig(overlay);
    };
    overlay.appendChild(container);

    body.style.overflow = 'hidden';
    body.appendChild(overlay);

    // vars for event listeners
    const textarea = document.getElementById(
        'btn-sonarr__config-testbox-textarea'
    );

    // event listeners

    // host and api key
    Array.from(document.querySelectorAll('.btn-sonarr__config-input')).forEach(
        (inputElem) => {
            const {
                configKey
            } = inputElem.dataset;
            if (configKey) {
                inputElem.addEventListener('change', async (event) => {
                    await setConfig(configKey, event.target.value);
                    await setConfig('hasSuccessfulConnection', false);
                    textarea.value = `Settings changed: Test Connection to continue using script`;
                    const sonarrBar = document.querySelector('.btn-sonarr__bar');
                    sonarrBar.dataset.isLoaded = '0';
                    handleCheckboxChange();
                });
            }
        }
    );

    // checkboxes
    Array.from(document.querySelectorAll('.btn-sonarr__config-checkbox')).forEach(
        (inputElem) => {
            inputElem.addEventListener('change', async (event) => {
                const {
                    checked
                } = event.target;
                const {
                    configKey
                } = inputElem.dataset;
                await setConfig(configKey, checked);
                addCheckboxesToSeries();
            });
        }
    );

    // close button
    document
        .querySelector('.btn-sonarr__config-button--close')
        ?.addEventListener('click', () => closeSonarrConfig(overlay));

    // test button
    document
        .querySelector('.btn-sonarr__config-button--test')
        ?.addEventListener('click', testConnection);

    // lock / unlock text input
    /* eslint-disable no-param-reassign */
    Array.from(
        document.querySelectorAll('.btn-sonarr__config-input-icon')
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
    const overlay = document.querySelector('.btn-sonarr__config-overlay');
    if (window.location.hash === '#sonarr') {
        if (!overlay) {
            createSonarrConfig();
        }
    }
    else if (overlay) {
        closeSonarrConfig(overlay);
    }
}

/**
 * Create the sonarr config tab
 */
function addSonarrConfigTab() {
    const openSettings = () => {
        window.location.hash = '#sonarr';
        checkOpenSettings();
    };

    GM.registerMenuCommand('Open Settings', openSettings, 's');
}

// ================================= CSS

/**
 * Create our custom style tag
 */
function createStyleTag(theme) {
    const css = `
.btn-sonarr__config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 100;
}

.btn-sonarr__config-container {
  width: 700px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  border-radius: 10px;
  padding: 0;
  background-color: #2F2F2F;
}

.btn-sonarr__config-container-content {
  padding: 15px;
}

.btn-sonarr__config-header {
  padding: 1px;
  text-align: center;
  font-size: 18px;
  background-color: #272727;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.btn-sonarr__config-desc {
  margin-bottom: 10px;
  filter: brightness(85%);
  padding-bottom: 15px;
  border-bottom: 1px dashed #999;
}

.btn-sonarr__config-testbox {
  float: right;
  width: 300px;
}

#btn-sonarr__config-testbox-textarea {
  display: block;
  margin-top: 5px;
  width: 100%;
  height: 235px;
  font-family: monospace;
  font-size: 10px;
}

.btn-sonarr__config-label {
  display: block;
  padding: 8px 0;
}

.btn-sonarr__config-label-aside {
  color: #ccc;
  font-size: 10px;
  padding-left: 5px;
}

.btn-sonarr__config-input {
  display: block; 
  margin-top: 5px;
  width: 340px;
}

.btn-sonarr__config-input-icon {
  position: absolute;
  top: 10px;
  right: 6px;
  font-size: 16px;
}

.btn-sonarr__config-input--with-icon {
  position: relative;
  display: inline-block;
}

.btn-sonarr__config-checkbox {
  margin-top: 5px!important;
  display: block!important;
}

.btn-sonarr__config-button {
  margin-top: 10px!important;
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
  background: #272727;
  border-radius: 2px;
  color: #c0bdda;
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
  border: 1px solid ${theme === 'default' ? '#666' : '#373257'};
  background: ${theme === 'default' ? '#333' : '#272727'};
  border-radius: ${theme === 'default' ? '0px' : '5px'};
  color: ${theme === 'default' ? '#fff' : '#c0bdda'};
  padding: 0.42rem;
  box-shadow: none;
  min-width: 120px;
  max-width: 140px;
  line-height: ${theme === 'default' ? '1' : '1.15'};
  font-weight: normal!important;
  text-align: left;
  margin: 0;
  cursor: default;
  ${theme === 'default' ? 'font-size: 11px' : ''}
}

.multi-select__button:hover {
  background: ${theme === 'default' ? '#333' : '#272727'};
  animation: none;
  cursor: default;
  ${theme === 'default' ? 'border: 1px solid #aaa;' : ''}
}

.multi-select__button:focus {
  background: ${theme === 'default' ? '#333' : '#272727'};
  border: 1px solid ${theme === 'default' ? '#aaa' : '#3a4056'};
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


.btn-sonarr__ribbon {
  width: 60px;
  height: 60px;
  position: absolute;
  left: 10px;
  top: 10px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s!important;
}

.btn-sonarr__ribbon--always,
.btn-sonarr__ribbon--forced,
*:hover > .btn-sonarr__ribbon {
  opacity: 0.75;
  transition: opacity 0.3s!important;
}

.btn-sonarr__ribbon > a,
.btn-sonarr__ribbon > span {
  position: absolute;
  display: block;
  width: 85px;
  padding: 5px;
  background-color: #3498db;
  box-shadow: 0 5px 10px rgb(0 0 0 / 10%);
  color: #fff;
  text-align: center;
  font-size: 8px;
  right: -1px;
  top: 3px;
  transform: rotate(-45deg);
}

.btn-sonarr__ribbon--existing > a,
.btn-sonarr__ribbon--existing > span {
  background-color: red;
}

.btn-sonarr__checkbox {
  position: absolute!important;
  top: 2px;
  left: 2px;
  opacity: 0;
  transition: opacity 0.3s!important;
}

.btn-sonarr__checkbox--forced,
.btn-sonarr__checkbox:checked,
*:hover > .btn-sonarr__checkbox {
  opacity: 1;
  transition: opacity 0.3s!important;
}


.btn-sonarr__bar {
  display: block;
  position: fixed;
  bottom: 0;
  left: 50%;
  max-width: 1170px;
  width: 100%;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  font-size: 12px;
  text-align: left;
  padding: 0;
  transform: translate(-50%, 100%);
  transition: transform 0.5s;
  background-color: #2f2f2f;
  border: 2px solid #272727;
  border-bottom: transparent;
  z-index: 10;
}

.btn-sonarr__bar--showing {
  transform: translate(-50%, 0%);
  transition: transform 0.5s;
}

.btn-sonarr__bar-label {
  display: inline-block;
  vertical-align: top;
  padding: 10px 9px;
}

.btn-sonarr__bar-label-text {
  display: block;
  margin-bottom: 5px;
}

.btn-sonarr__bar-multi-label {
  display: flex;
  flex-direction: column;
}

.btn-sonarr__bar-multi-label label {
  display: flex;
  gap: 5px;
}

.btn-sonarr__bar-button {
  padding: 0.3rem;
}

.btn-sonarr__bar-select {
  min-width: 120px;
  max-width: 140px;
  padding: 0.3rem;
}

#btn-sonarr__bar-submit {
  min-width: 120px;
}
  `;

    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));

    document.head.appendChild(style);
}

// ================================= Main Runner

(async function run() {
    createStyleTag(getTheme());
    addSonarrConfigTab();

    // make sure we can add a checkbox to at least one item on the page, before rendering the other things
    const addedCheckboxes = await addCheckboxesToSeries();
    if (addedCheckboxes) {
        addSonarrBar();

        window.addEventListener('hashchange', checkOpenSettings);
        checkOpenSettings();
    }
})();
