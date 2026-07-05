// TurboTune popup logic (Manifest V3)

document.addEventListener('DOMContentLoaded', () => {
    const MIN = 0.0625;
    const MAX = 16;
    const STEP = 0.25;
    const PRESETS = [0.5, 1, 1.5, 2, 3];

    const els = {
        value: document.getElementById('speedValue'),
        label: document.getElementById('speedLabel'),
        minus: document.getElementById('minus'),
        plus: document.getElementById('plus'),
        slider: document.getElementById('slider'),
        presets: document.getElementById('presets'),
        input: document.getElementById('inpspeed'),
        apply: document.getElementById('apply'),
        toggle: document.getElementById('autoToggle'),
        status: document.getElementById('status'),
    };

    let hasVideo = false;
    let tabId = null;
    let injectable = false;   // can we run on this page at all?

    const clamp = (v) => Math.min(MAX, Math.max(MIN, v));
    const round2 = (v) => Math.round(v * 100) / 100;

    // --- talk to the active tab's content script ----------------------------

    function getActiveTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                resolve(tabs[0] || null);
            });
        });
    }

    // Make sure the content script is present even if the tab was open before
    // the extension was (re)loaded. Idempotent thanks to the __turboTuneLoaded
    // guard in content.js. Returns false on restricted pages (chrome://, store).
    async function ensureInjected() {
        if (tabId == null) return false;
        try {
            await chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                files: ['content.js'],
            });
            return true;
        } catch (_) {
            return false;
        }
    }

    function sendToTab(message) {
        return new Promise((resolve) => {
            if (tabId == null) return resolve(null);
            chrome.tabs.sendMessage(tabId, message, (response) => {
                void chrome.runtime.lastError;   // swallow "no receiver" noise
                resolve(response || null);
            });
        });
    }

    // --- UI rendering -------------------------------------------------------

    function renderSpeed(speed, { fromLive = false } = {}) {
        const s = round2(clamp(speed));
        els.value.textContent = s.toFixed(2);

        // Keep the slider within its visible 0.25–4 range without clamping stored value.
        const sliderVal = Math.min(4, Math.max(0.25, s));
        els.slider.value = sliderVal;
        const fill = ((sliderVal - 0.25) / (4 - 0.25)) * 100;
        els.slider.style.setProperty('--fill', `${fill}%`);

        // Highlight a matching preset chip.
        document.querySelectorAll('.chip').forEach((chip) => {
            chip.classList.toggle('active', parseFloat(chip.dataset.speed) === s);
        });

        els.label.textContent = fromLive ? 'CURRENT SPEED' : 'TARGET SPEED';
    }

    function setStatus(text, warn = false) {
        els.status.textContent = text || '';
        els.status.classList.toggle('warn', !!warn);
    }

    // --- actions ------------------------------------------------------------

    async function applySpeed(speed, { persist = true } = {}) {
        const s = round2(clamp(speed));
        renderSpeed(s);
        if (persist) chrome.storage.local.set({ speed: s });

        const res = await sendToTab({ type: 'SET_SPEED', speed: s });
        if (res && res.hasVideo) {
            hasVideo = true;
            setStatus(`Applied ${s}× to this tab.`);
        } else {
            hasVideo = false;
            setStatus('Saved. Open a page with a video to see it applied.', true);
        }
    }

    function currentSpeed() {
        return round2(clamp(parseFloat(els.value.textContent) || 1));
    }

    // Steppers
    els.minus.addEventListener('click', () => applySpeed(currentSpeed() - STEP));
    els.plus.addEventListener('click', () => applySpeed(currentSpeed() + STEP));

    // Slider (live while dragging, persist on release)
    els.slider.addEventListener('input', () => {
        const s = round2(parseFloat(els.slider.value));
        renderSpeed(s);
        sendToTab({ type: 'SET_SPEED', speed: s });
    });
    els.slider.addEventListener('change', () => {
        chrome.storage.local.set({ speed: round2(parseFloat(els.slider.value)) });
    });

    // Preset chips
    els.presets.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        applySpeed(parseFloat(chip.dataset.speed));
    });

    // Custom input + Apply.
    // If a custom value is typed, apply that; otherwise (empty field) just
    // re-apply the speed currently shown in the readout.
    els.apply.addEventListener('click', () => {
        const raw = els.input.value.trim();
        if (raw === '') {
            applySpeed(currentSpeed());
            return;
        }
        const s = parseFloat(raw);
        if (!isNaN(s) && s > 0) {
            applySpeed(s);
            els.input.value = '';
        } else {
            setStatus('Please enter a valid speed.', true);
        }
    });
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); els.apply.click(); }
    });

    // Auto-apply toggle
    els.toggle.addEventListener('change', () => {
        chrome.storage.local.set({ autoEnabled: els.toggle.checked });
        setStatus(els.toggle.checked
            ? 'Auto-apply on. Speed persists across videos & reloads.'
            : 'Auto-apply off. Videos start at their default speed.');
    });

    // --- init: load stored prefs + live state from the tab ------------------

    (async () => {
        const data = await new Promise((r) =>
            chrome.storage.local.get(['speed', 'autoEnabled'], r));
        const stored = round2(clamp(parseFloat(data.speed) || 1));
        els.toggle.checked = data.autoEnabled ?? true;   // default ON
        renderSpeed(stored);

        const tab = await getActiveTab();
        tabId = tab && tab.id != null ? tab.id : null;
        injectable = await ensureInjected();

        const state = await sendToTab({ type: 'GET_STATE' });
        if (state && state.hasVideo) {
            hasVideo = true;
            renderSpeed(state.active ? state.desiredSpeed : state.currentSpeed, { fromLive: true });
            setStatus(`Video detected · playing at ${round2(state.currentSpeed)}×`);
        } else {
            hasVideo = false;
            setStatus(injectable
                ? 'No video detected on this tab yet.'
                : "TurboTune can't run on this page.", true);
        }
    })();
});
