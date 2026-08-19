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

- particle size
- ambient motion strength
- velocity damping
- camera-force gain
- flow smoothing, clamp, and confidence threshold
- optical-flow debug view

The defaults are proposals, not final design choices. Real-camera behavior must
be reviewed at Human Gate M1A. See
[`MILESTONES.md`](./MILESTONES.md) and [`HUMAN_JUDGMENT.md`](./HUMAN_JUDGMENT.md).

## M1A review

Run the demo in two lighting conditions. Wave a hand horizontally and vertically,
then hold still. Toggle Flow debug to inspect direction, magnitude, and
confidence. Evaluate whether motion is legible, stable, and responsive without
the field drifting or exploding. Record the decision using the M1A template in
`MILESTONES.md`.
