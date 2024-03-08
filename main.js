document.getElementById("apply").addEventListener("click", function () {
    var speed = document.getElementById('speed').value;
    var speed2 = document.getElementById('inpspeed').value;
    if (!isNaN(speed) && speed > 0) {
        ChangeSpeed(speed);
    }
    else {
        ChangeSpeed(speed2);
    }

})
document.addEventListener("keydown", function (Event) {
    if (Event.key === "Enter") {
        Event.preventDefault();
        var speed = document.getElementById('speed').value;
        ChangeSpeed(speed);
    }
})

function ChangeSpeed(speed) {
    if (!isNaN(speed) && speed > 0) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'changeSpeed', speed: speed });
        });
    }
    else {
        alert('Invalid speed. Please enter a valid number greater than 0.');
    }
}
