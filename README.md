# Flow Injection

> Your movement becomes a GPU velocity field.

Flow Injection turns live webcam motion into a field that drives hundreds of
thousands of particles in real time. Camera preprocessing, pyramidal
Lucas–Kanade optical flow, confidence filtering, particle advection, composition,
and drawing all happen on the GPU inside **one command encoder and one queue
submission per frame**.

No server inference. No camera upload. No CPU readback of the flow field.

## What it looks like

Move in front of the camera and the particle field follows. The presentation can
shift continuously from the untouched webcam to the generated effect with the
**Dry / wet** control.

- **Ghost Current** — restrained, luminous currents on a dark field
- **Electric Flow** — direction-colored energy and longer streaks
- **Silhouette Field** — compact white motion that emphasizes the subject
- **Colored flow field** — the motion estimate itself, colored by direction and
  weighted by confidence

## Run locally

Requirements: Node.js 20+ and a current WebGPU-capable browser.

```bash
npm run check
npm test
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173), allow camera access, and
open **Tune**. Build a deployable static directory with:

```bash
npm run build
```

For testing on another device on a trusted local network:

```bash
npm run dev:lan
```

Then open `http://<computer-lan-ip>:4173`. Browsers generally require a secure
context for camera access, so a phone may require an HTTPS preview or deployed
URL instead of plain LAN HTTP. Stop the LAN server when testing is complete.

## Frame architecture

Every animation frame is assembled in [`src/frame.js`](./src/frame.js):

```text
webcam ──┬─→ color capture ───────────────────────────────┐
         │                                                │
         └─→ grayscale pyramid → optical flow → filter    │
                                          │               │
                                          └─→ particles   │
                                                          ↓
                          dry/wet composite → particle draw → screen
```

```js
const encoder = device.createCommandEncoder();
// render: camera → grayscale and color textures
// compute: pyramid → LK flow → EMA/confidence → particle A → B
// render: dry/wet composite → optional colored flow field → particles
device.queue.submit([encoder.finish()]);
```

The main pieces are:

| Stage | Implementation |
|---|---|
| Camera | Imported as a GPU external texture |
| Pyramid | Four grayscale levels: 160×90 down to 20×12 |
| Flow | Three Lucas–Kanade refinements per level, coarse to fine |
| Stability | Structure-tensor confidence, temporal EMA, magnitude clamp |
| Particles | Ping-pong storage buffers with bilinear flow sampling |
| Drawing | Instanced velocity-stretched quads with additive blending |
| Composition | Webcam-to-effect dry/wet blend on the GPU |

## Controls

| Control | Purpose |
|---|---|
| Particle quality | 65k, 131k, 197k, or 262k particles |
| Adaptive quality | Holds the approved frame-rate policy automatically |
| Particle size | Changes particle and streak width |
| Ambient motion | Keeps the field alive when the scene is still |
| Damping | Controls particle momentum |
| Camera force | Scales webcam-derived motion |
| Flow smoothing | Trades immediate response for stability |
| Flow clamp | Limits extreme motion estimates |
| Confidence | Rejects unreliable flow regions |
| Visual mode | Switches among Ghost, Electric, and Silhouette |
| Colored flow field | Displays direction-colored optical flow |
| Dry / wet | Blends from raw webcam to the generated presentation |

The Tune panel scrolls independently on smaller screens. When timestamp queries
are available, hover the GPU timing readout for the per-stage breakdown.

## Performance policy

Adaptive quality targets 60 fps. It steps down when measured performance falls
below 50 fps and steps up above 58 fps, with a 2.5-second cooldown. Current tiers
are 65,536, 131,072, 196,608, and 262,144 particles.

These are implementation settings, not universal performance claims. Sustained
desktop and Android measurements remain intentionally blank until they are
verified on named physical devices. See [`BENCHMARKS.md`](./BENCHMARKS.md).

## Compatibility and privacy

The initial targets are Chromium-family desktop browsers and Android Chrome.
Safari is unverified. WebGPU support, external-texture behavior, timestamp
queries, and sustained performance vary by browser and hardware.

Camera frames stay inside the page. They are sampled into GPU textures and are
not uploaded, recorded, stored, or read back to JavaScript. This repository has
no analytics. If camera permission is denied, ambient particles remain available
but camera-driven motion and the dry webcam view do not.

## Project status

The classical optical-flow pipeline and three particle presentations have passed
their visual gates. The compatibility policy is approved; verified physical-device
benchmarks and public-release authorization remain pending. Optional learned-flow
and depth-conditioned variants have separate decision gates.

- [`MILESTONES.md`](./MILESTONES.md) — implementation sequence and evidence
- [`HUMAN_JUDGMENT.md`](./HUMAN_JUDGMENT.md) — decisions agents must not make
- [`DECISIONS.md`](./DECISIONS.md) — recorded approvals
- [`M4_PLAN.md`](./M4_PLAN.md) — optional depth/flow research plan
- [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) — publication requirements

## Repository map

```text
src/
├── frame.js                 # the single-encoder frame graph
├── camera.js                # local webcam acquisition
├── gpu.js                   # WebGPU setup and canvas sizing
├── params.js                # live Tune controls
└── shaders/
    ├── preprocess.wgsl      # camera → grayscale
    ├── downsample.wgsl      # image pyramid
    ├── lk.wgsl              # coarse-to-fine optical flow
    ├── flow_post.wgsl       # confidence, smoothing, clamp
    ├── advect.wgsl          # particle simulation
    ├── composite.wgsl       # dry/wet camera composition
    ├── flow_debug.wgsl      # colored flow-field presentation
    └── draw.wgsl            # particle rendering
```
