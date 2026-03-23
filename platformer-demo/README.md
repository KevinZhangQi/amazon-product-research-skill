# Joy-Con Platformer Demo

A lightweight browser platformer prototype intended as a starting point for a Joy-Con-aware web game.

## What is included

- Single-screen platformer level rendered on HTML5 canvas
- Two-player support with up to two connected gamepads
- Keyboard fallback for quick local testing
- Reset button and connected-controller status panel

## Controls

### Keyboard fallback
- Player 1: `A` / `D` to move, `W` to jump
- Player 2: `←` / `→` to move, `↑` or `Space` to jump

### Gamepad / Joy-Con
- Left stick or D-pad to move
- South face button (`A` on many controllers) to jump

## Run locally

Because browsers restrict some gamepad behavior on `file://`, it is best to serve the folder with a simple static server.

Examples:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/platformer-demo/
```

## Next steps

- Add WebHID-based Joy-Con pairing for more deterministic left/right Joy-Con support
- Split controller assignment UI so each Joy-Con can explicitly bind to one player
- Add collectibles, enemies, and sound effects
