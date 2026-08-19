# Flow Injection

Flow Injection is a WebGPU experiment that turns webcam motion into a velocity
field for hundreds of thousands of GPU particles. The current M0 build proves
the particle architecture with ambient curl motion; optical flow begins only
after the M0 human visual gate is approved.

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

## M0 architecture

Each animation frame is deliberately encoded in one readable function in
[`src/frame.js`](./src/frame.js):

```js
const encoder = device.createCommandEncoder();
// compute: particle A → particle B
// render: camera ghost, then instanced particle quads
device.queue.submit([encoder.finish()]);
```

Two 32-byte particle storage buffers ping-pong between compute and rendering.
The webcam is imported as a GPU external texture. Every particle is an instanced
quad stretched along its velocity vector and additively blended.

## Current controls

- particle size
- ambient motion strength
- velocity damping
- camera ghost opacity

The defaults are proposals, not final design choices. They must be reviewed at
Human Gate M0 before optical-flow implementation starts. See
[`MILESTONES.md`](./MILESTONES.md) and [`HUMAN_JUDGMENT.md`](./HUMAN_JUDGMENT.md).

## M0 review

Run the demo, then evaluate whether idle motion feels alive, particle density
and streaks are legible, the camera ghost supports rather than obscures the
field, and permission/failure states are acceptable. Record the decision using
the M0 template in `MILESTONES.md`.
