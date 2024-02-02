document.getElementById("apply").addEventListener("click", function () {
    var speed = document.getElementById('speed').value;

    if (!isNaN(speed) && speed > 0) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'changeSpeed', speed: speed });
        });
    }
    else {
        alert('Invalid speed. Please enter a valid number greater than 0.');
    }
})