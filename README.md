
# TurboTune — Playback Speed Controller

## Introduction

TurboTune is a browser extension that gives you full control over the playback
speed of **YouTube and any HTML5 `<video>` on the web**. Speed up lectures, slow
down tutorials, or fine-tune any player to your preferred pace — from the popup,
with keyboard shortcuts, or automatically on every video you open.

![image](https://github.com/divyanshu-prakash-rx/TurboTune/assets/66553918/290532b2-4d9c-47fa-ab85-08d64b865dfd)

## Features

- ⚡ **Works everywhere** — YouTube plus any site using HTML5 video (Vimeo,
  course platforms, news sites, embedded players, …).
- 🎚️ **Rich popup** — live speed readout, slider, quick presets, ± steppers,
  and a custom speed field (0.0625×–16×).
- ⌨️ **Keyboard shortcuts** — while watching a video:
  - `]` faster · `[` slower · `\` reset to 1×
  - Optional global shortcuts (rebindable at `chrome://extensions/shortcuts`):
    `Alt+.` faster · `Alt+,` slower · `Alt+0` reset
- 💬 **On-screen overlay** — a quick "⚡ 2×" toast shows the new speed, and it
  stays visible in fullscreen.
- 🔁 **Auto-apply** — remembers your speed and re-applies it across page reloads,
  SPA navigation, and playlist / next-video swaps.
- 🔒 **Self-contained & private** — no CDNs, no trackers, no network calls; all
  UI assets are bundled locally.

## Installation

### Prerequisites
A Chromium-based browser (Chrome, Edge, Brave, …) or Firefox.

### Steps
1. **Download / clone** this repository and extract it to a folder of your choice.

   ```
   git clone https://github.com/divyanshu-prakash-rx/TurboTune.git
   ```

2. **Open the extensions page:**
   - Chrome / Edge / Brave: `chrome://extensions/`
   - Firefox: `about:debugging#/runtime/this-firefox`

3. **Enable Developer mode**, then click **Load unpacked** (Chrome) or
   **Load Temporary Add-on** (Firefox) and select the TurboTune folder.

4. The TurboTune icon appears in your toolbar — you're ready to go.

## Usage

- Open any video page and click the TurboTune icon to set a speed, or use the
  `[` / `]` / `\` shortcuts directly on the page.
- Turn on **Auto-apply** to have your chosen speed follow you across videos and
  reloads automatically.

## Tech notes

Built on **Manifest V3** (service worker + `chrome.action` + `chrome.commands`),
so it stays supported by current Chrome/Edge versions.

Enjoy a customized viewing experience with TurboTune!
