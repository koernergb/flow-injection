# Flow Injection

Flow Injection is a WebGPU experiment that turns webcam motion into a velocity
field for hundreds of thousands of GPU particles. The M1 build computes a
four-level pyramidal Lucas–Kanade flow field and consumes it during particle
advection without reading camera or flow data back to the CPU.

## Run it

Requirements: a current WebGPU-capable browser and Node.js 20 or newer.

```bash
npm run check
npm run dev
```

Open <http://127.0.0.1:4173> and allow camera access. Camera frames are sampled
locally by WebGPU and are never uploaded. If permission is denied, the ambient
particle field continues without the camera ghost.

Build a deployable static directory with `npm run build`.

For phone testing on the same trusted local network, run `npm run dev:lan` and
open `http://<computer-lan-ip>:4173` on the phone. This deliberately exposes the
development server to the local network; stop it after testing. Camera access on
a non-loopback HTTP origin may require a temporary HTTPS tunnel or the deployed
Pages URL because browsers generally require a secure context for `getUserMedia`.

## Frame architecture

Each animation frame is deliberately encoded in one readable function in
[`src/frame.js`](./src/frame.js):

```js
const encoder = device.createCommandEncoder();
// render: camera → grayscale texture
// compute: pyramid → LK flow → EMA/confidence → particle A → B
// render: instanced particle quads
device.queue.submit([encoder.finish()]);
```

Two 32-byte particle storage buffers ping-pong between compute and rendering.
The webcam is imported as a GPU external texture and immediately converted to a
160×90 grayscale pyramid. Three LK refinements run at each of four levels. The
filtered flow texture is bilinearly sampled by particle positions. Every
particle is an instanced quad stretched along its velocity vector and additively
blended. The webcam itself is not drawn.

## Current controls

- particle quality with an adaptive 60-fps policy
- particle size
- ambient motion strength
- velocity damping
- camera-force gain
- flow smoothing, clamp, and confidence threshold
- optical-flow debug view
- three live presentation modes: Ghost Current, Electric Flow, and Silhouette Field

When the device supports WebGPU timestamp queries, the top-right readout reports
total GPU time and exposes the per-stage breakdown on hover. Unsupported devices
show `GPU n/a` without affecting the demo. The current adaptive policy steps
between 65k, 131k, 197k, and 262k particles: it steps down below 50 fps and steps
up above 58 fps, with a 2.5-second cooldown. This policy remains subject to
Human Gate M2A review.

## Compatibility and privacy

The primary camera path uses `device.importExternalTexture()`, currently best
supported in Chromium-family WebGPU implementations. WebGPU availability,
external-texture behavior, timestamp queries, and sustained performance vary by
browser and device; the release compatibility statement will be based on
physical-device tests rather than assumed support.

Camera frames stay inside the page. They are sampled into GPU textures and are
not uploaded, recorded, stored, or read back to JavaScript. This repository has
no analytics. Denying camera permission leaves the ambient particle field
available, but optical-flow response naturally remains inactive.

See [`BENCHMARKS.md`](./BENCHMARKS.md) for the measurement method and
[`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) for the gated release process.

The defaults are proposals, not final design choices. Real-camera behavior must
be reviewed at Human Gate M1A. See
[`MILESTONES.md`](./MILESTONES.md) and [`HUMAN_JUDGMENT.md`](./HUMAN_JUDGMENT.md).

## M1A review

Run the demo in two lighting conditions. Wave a hand horizontally and vertically,
then hold still. Toggle Flow debug to inspect direction, magnitude, and
confidence. Evaluate whether motion is legible, stable, and responsive without
the field drifting or exploding. Record the decision using the M1A template in
`MILESTONES.md`.
