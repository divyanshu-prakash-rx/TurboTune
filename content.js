let desiredSpeed = 1.0;

// Apply speed to the current video
function setPlaybackSpeed(speed) {
    const video = document.querySelector('video.html5-main-video');
    if (video && !isNaN(speed)) {
        video.playbackRate = speed;
        console.log(`[TurboTune] Speed set to ${speed}x`);
    }
}

// Watch for YouTube page changes (SPA navigation)
function observeYouTubeNavigation() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('[TurboTune] URL changed:', currentUrl);
            onVideoChanged();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Call when a new video is loaded
function onVideoChanged() {
    const tryApply = () => {
        const video = document.querySelector('video.html5-main-video');
        if (video) {
            video.playbackRate = desiredSpeed;
            console.log(`[TurboTune] Applied speed ${desiredSpeed}x on new video.`);
        } else {
            setTimeout(tryApply, 500);
        }
    };

    tryApply();
}

// Observe video changes within playlists
function observeVideoChanges() {
    // Listen for video element changes directly
    document.addEventListener('loadeddata', function(e) {
        if (e.target.tagName === 'VIDEO') {
            console.log('[TurboTune] Video content changed (loadeddata event)');
            setPlaybackSpeed(desiredSpeed);
        }
    }, true);
    
    // Also observe the player container for changes
    const playerObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                const video = document.querySelector('video.html5-main-video');
                if (video && Math.abs(video.playbackRate - desiredSpeed) > 0.01) {
                    console.log('[TurboTune] Player changed, reapplying speed');
                    setPlaybackSpeed(desiredSpeed);
                }
            }
        }
    });
    
    // Start observing the player container
    setTimeout(() => {
        const playerContainer = document.getElementById('movie_player') || 
                               document.querySelector('.html5-video-player');
        if (playerContainer) {
            playerObserver.observe(playerContainer, { 
                childList: true, 
                subtree: true,
                attributes: true
            });
            console.log('[TurboTune] Player observer attached');
        } else {
            console.log('[TurboTune] Player container not found, will retry');
            setTimeout(observeVideoChanges, 1000);
        }
    }, 1000);
}

// Handle timeupdate events to ensure speed is maintained
function setupTimeUpdateListener() {
    document.addEventListener('timeupdate', function(e) {
        if (e.target.tagName === 'VIDEO' && 
            Math.abs(e.target.playbackRate - desiredSpeed) > 0.01) {
            console.log('[TurboTune] Speed reset detected, reapplying');
            e.target.playbackRate = desiredSpeed;
        }
    }, true);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'changeSpeed') {
        const speed = parseFloat(request.speed);
        if (!isNaN(speed)) {
            desiredSpeed = speed;
            setPlaybackSpeed(speed);
        }
    }
});

// Initialize everything
function initialize() {
    chrome.storage.local.get(["speed", "autoEnabled"], (data) => {
        if (data.autoEnabled !== false) { 
            desiredSpeed = parseFloat(data.speed) || 1.0;
            console.log(`[TurboTune] Auto mode ON. Target speed: ${desiredSpeed}x`);
            onVideoChanged();
            
            observeYouTubeNavigation();
            observeVideoChanges();
            setupTimeUpdateListener();
        } else {
            console.log('[TurboTune] Auto mode OFF');
        }
    });
}

console.log('[TurboTune] Content script loaded');
initialize();