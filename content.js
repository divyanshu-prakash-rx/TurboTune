chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'changeSpeed') {
        var speed = parseFloat(request.speed);
        document.querySelector('video.html5-main-video').playbackRate = speed;

    }
});