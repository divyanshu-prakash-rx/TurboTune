// TurboTune background service worker (Manifest V3)
// Relays global keyboard commands (chrome://extensions/shortcuts) to the
// content script running in the active tab.

const STEP = 0.25;

const COMMANDS = {
    'speed-up': { type: 'NUDGE', delta: STEP },
    'speed-down': { type: 'NUDGE', delta: -STEP },
    'speed-reset': { type: 'SET_SPEED', speed: 1.0 },
};

chrome.commands.onCommand.addListener((command) => {
    const message = COMMANDS[command];
    if (!message) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) return;
        // Broadcast to all frames; the frame(s) with a video will act on it.
        chrome.tabs.sendMessage(tab.id, message, () => {
            // Swallow "no receiving end" errors on pages without the content script.
            void chrome.runtime.lastError;
        });
    });
});
