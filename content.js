// TurboTune content script (Manifest V3)
// Controls playback speed for any HTML5 <video> on the page, with keyboard
// shortcuts, an on-screen overlay, and robust re-application across SPA
// navigation and playlist/video swaps (YouTube-friendly).

(() => {
    'use strict';

    // Guard against double-injection (declared content script + on-demand
    // injection from the popup) so we never register duplicate listeners.
    if (window.__turboTuneLoaded) return;
    window.__turboTuneLoaded = true;

    const MIN_SPEED = 0.0625;   // 1/16x
    const MAX_SPEED = 16;
    const STEP = 0.25;

    // On-page single-key shortcuts (active only while typing in an input is NOT).
    const KEYS = {
        ']': 'faster',
        '[': 'slower',
        '\\': 'reset',
    };

    let desiredSpeed = 1.0;
    let active = false;         // whether we are actively enforcing a speed
    const HOOKED = '__turbotuneHooked';

    const clamp = (v) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, v));
    const round2 = (v) => Math.round(v * 100) / 100;

    // ---- video discovery ----------------------------------------------------

    function getVideos() {
        return Array.from(document.querySelectorAll('video'));
    }

    // The "main" video = the largest one currently on screen (falls back to any).
    function getPrimaryVideo() {
        const vids = getVideos();
        if (vids.length === 0) return null;
        let best = null;
        let bestArea = -1;
        for (const v of vids) {
            const r = v.getBoundingClientRect();
            const area = Math.max(0, r.width) * Math.max(0, r.height);
            if (area > bestArea) {
                bestArea = area;
                best = v;
            }
        }
        return best || vids[0];
    }

    // ---- applying speed -----------------------------------------------------

    function applySpeed(speed, { showUi = false } = {}) {
        desiredSpeed = clamp(speed);
        active = true;
        const vids = getVideos();
        for (const v of vids) {
            try {
                if (Math.abs(v.playbackRate - desiredSpeed) > 0.001) {
                    v.playbackRate = desiredSpeed;
                }
                hookVideo(v);
            } catch (_) { /* cross-origin / detached */ }
        }
        if (showUi) showOverlay(desiredSpeed);
        return desiredSpeed;
    }

    function nudge(delta) {
        const base = active ? desiredSpeed : (getPrimaryVideo()?.playbackRate ?? 1.0);
        const next = round2(clamp(base + delta));
        applySpeed(next, { showUi: true });
        persist(next);
        return next;
    }

    // Re-enforce desired speed if the page tries to reset it.
    function hookVideo(video) {
        if (!video || video[HOOKED]) return;
        video[HOOKED] = true;
        video.addEventListener('ratechange', () => {
            if (active && Math.abs(video.playbackRate - desiredSpeed) > 0.01) {
                try { video.playbackRate = desiredSpeed; } catch (_) { /* noop */ }
            }
        });
        // Newly attached media should immediately adopt the desired speed.
        video.addEventListener('loadeddata', () => {
            if (active) {
                try { video.playbackRate = desiredSpeed; } catch (_) { /* noop */ }
            }
        });
    }

    function reapply() {
        if (!active) return;
        for (const v of getVideos()) {
            try {
                if (Math.abs(v.playbackRate - desiredSpeed) > 0.01) {
                    v.playbackRate = desiredSpeed;
                }
                hookVideo(v);
            } catch (_) { /* noop */ }
        }
    }

    // ---- on-screen overlay --------------------------------------------------

    let overlayEl = null;
    let overlayTimer = null;

    function ensureOverlay() {
        if (overlayEl && overlayEl.isConnected) return overlayEl;
        overlayEl = document.createElement('div');
        overlayEl.setAttribute('data-turbotune-overlay', '');
        Object.assign(overlayEl.style, {
            position: 'fixed',
            top: '12%',
            left: '50%',
            transform: 'translateX(-50%) scale(0.96)',
            zIndex: '2147483647',
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'rgba(3, 20, 42, 0.92)',
            color: '#fff',
            font: '600 20px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            letterSpacing: '0.5px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            border: '1px solid rgba(120, 190, 255, 0.35)',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 160ms ease, transform 160ms ease',
        });
        return overlayEl;
    }

    function showOverlay(speed) {
        const el = ensureOverlay();
        // Re-parent to the fullscreen element so it stays visible in fullscreen.
        const host = document.fullscreenElement || document.body;
        if (!host) return;
        if (el.parentNode !== host) host.appendChild(el);
        el.textContent = `⚡ ${round2(speed)}×`;

        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) scale(1)';
        });
        clearTimeout(overlayTimer);
        overlayTimer = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) scale(0.96)';
        }, 900);
    }

    // ---- keyboard shortcuts -------------------------------------------------

    function isTyping(target) {
        if (!target) return false;
        const tag = target.tagName;
        return (
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT' ||
            target.isContentEditable === true
        );
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave modified combos alone
        if (isTyping(e.target)) return;
        const action = KEYS[e.key];
        if (!action) return;
        if (getVideos().length === 0) return;

        if (action === 'faster') nudge(STEP);
        else if (action === 'slower') nudge(-STEP);
        else if (action === 'reset') { applySpeed(1.0, { showUi: true }); persist(1.0); }

        e.preventDefault();
        e.stopPropagation();
    }, true);

    // ---- observers (SPA navigation + new videos) ----------------------------

    let scanScheduled = false;
    function scheduleScan() {
        if (scanScheduled) return;
        scanScheduled = true;
        requestAnimationFrame(() => {
            scanScheduled = false;
            reapply();
        });
    }

    function startObservers() {
        const target = document.body || document.documentElement;
        if (!target) return;

        // Watch DOM mutations for newly added <video> elements / player swaps.
        const mo = new MutationObserver(() => scheduleScan());
        mo.observe(target, { childList: true, subtree: true });

        // Watch SPA URL changes (YouTube navigates without full reloads).
        // Only needed in the top frame — avoids a timer in every embedded iframe.
        if (window === window.top) {
            let lastUrl = location.href;
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    // Give the new player a moment to mount, then enforce.
                    setTimeout(reapply, 300);
                    setTimeout(reapply, 1000);
                }
            }, 500);
        }
    }

    // ---- messaging (popup + background commands) ----------------------------

    // The popup broadcasts to every frame (all_frames). To avoid a frameless
    // subframe (ads, embeds) answering first with hasVideo:false, each frame
    // only *responds* when it actually has a video — but SET_SPEED/NUDGE are
    // still *applied* in every frame so any video, wherever it lives, reacts.
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        const type = request?.type
            || (request?.action === 'changeSpeed' ? 'SET_SPEED' : undefined);

        const hasVideo = getVideos().length > 0;

        if (type === 'SET_SPEED') {
            const s = parseFloat(request.speed);
            if (!isNaN(s)) applySpeed(s, { showUi: hasVideo });
        } else if (type === 'NUDGE') {
            if (hasVideo) nudge(parseFloat(request.delta) || 0);
        }

        // Only frames that host a video answer, so the popup's callback gets a
        // meaningful reply. Frames without one decline (return false).
        if (!hasVideo) return false;

        if (type === 'GET_STATE') {
            const v = getPrimaryVideo();
            sendResponse({
                hasVideo: true,
                currentSpeed: round2(v.playbackRate),
                desiredSpeed: round2(desiredSpeed),
                active,
            });
        } else {
            sendResponse({ ok: true, hasVideo: true, speed: round2(desiredSpeed) });
        }
        return true;
    });

    // ---- persistence --------------------------------------------------------

    let persistTimer = null;
    function persist(speed) {
        // Persist only the speed; never override the user's auto-apply toggle.
        clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
            try {
                chrome.storage.local.set({ speed });
            } catch (_) { /* context invalidated */ }
        }, 150);
    }

    // ---- init ---------------------------------------------------------------

    function init() {
        startObservers();
        chrome.storage.local.get(['speed', 'autoEnabled'], (data) => {
            const auto = data.autoEnabled !== false;   // default ON
            const stored = parseFloat(data.speed);
            if (auto && !isNaN(stored) && stored > 0) {
                desiredSpeed = clamp(stored);
                active = true;
                reapply();
                // Enforce a few times as the player finishes mounting.
                setTimeout(reapply, 400);
                setTimeout(reapply, 1200);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
