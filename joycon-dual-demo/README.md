# Dual Joy-Con Platformer Demo

A small browser game demo aimed at validating a real two-Joy-Con control scheme for a web game.

## Scope

This version is intentionally biased toward the setup you described:

- one **left Joy-Con** assigned to **Player 1**
- one **right Joy-Con** assigned to **Player 2**
- browser-first experience with a lightweight HTML/CSS/JS stack

## Current architecture

- **WebHID** is used to request and classify Nintendo Joy-Con devices by vendor/product ID.
- **Gamepad API** is used for the actual gameplay polling loop.
- Keyboard fallback remains available for quick testing without hardware.

This split keeps the prototype simple while making the UI and assignment flow explicitly Joy-Con-oriented.

## Recommended environment

- macOS or Windows desktop
- Chrome or Edge
- Joy-Con controllers connected to the OS over Bluetooth

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/joycon-dual-demo/
```

## Important limitation

This is a practical starter demo, not a full HID parser. It uses WebHID to discover and side-classify Joy-Con devices, then relies on browser gamepad mapping to read movement/jump input. That means some browser / OS combinations may still need additional calibration or a lower-level HID parser for perfect consistency.

## Good next upgrades

- explicit in-game binding confirmation for each Joy-Con
- per-device calibration and deadzone tuning
- WebHID input report parsing for tighter Joy-Con-specific control
- sound effects, collectibles, hazards, and start / win screens
