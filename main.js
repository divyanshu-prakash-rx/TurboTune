document.addEventListener("DOMContentLoaded", function () {
    const applyBtn = document.getElementById("apply");
    const speedSelect = document.getElementById('speed');
    const speedInput = document.getElementById('inpspeed');
    const toggle = document.getElementById('autoToggle');

    chrome.storage.local.get(["speed", "autoEnabled"], function (data) {
        if (data.speed) {
            speedSelect.value = data.speed;
            speedInput.value = data.speed;
        }
        toggle.checked = data.autoEnabled ?? false;
    });

    applyBtn.addEventListener("click", function () {
        let speed = parseFloat(speedSelect.value);
        let speed2 = parseFloat(speedInput.value);

        let finalSpeed = (!isNaN(speed) && speed > 0) ? speed : speed2;

        if (!isNaN(finalSpeed) && finalSpeed > 0) {
            chrome.storage.local.set({
                speed: finalSpeed,
                autoEnabled: toggle.checked
            });

            ChangeSpeed(finalSpeed);
        } else {
            alert("Please enter a valid speed.");
        }
    });

    document.addEventListener("keydown", function (Event) {
        if (Event.key === "Enter") {
            Event.preventDefault();
            applyBtn.click();
        }
    });

    function ChangeSpeed(speed) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'changeSpeed',
                speed: speed
            });
        });
    }
});
