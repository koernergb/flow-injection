# Flow Injection — Build Brief

> **Implementation control:** This brief defines the product and technical
> direction. Execute it through [MILESTONES.md](./MILESTONES.md). Decisions that
> require visual taste, real-device observation, scope ownership, licensing,
> spending, benchmark verification, or publication are reserved for a human as
> described in [HUMAN_JUDGMENT.md](./HUMAN_JUDGMENT.md). At every labeled human
> gate, an implementation agent must pause and receive explicit approval before
> continuing dependent work.

**Working name:** `flowfield` (or `advect`)

**One-line pitch:** Optical flow computed and consumed inside a single WebGPU command encoder — the flow field never leaves the GPU, it becomes the velocity field for half a million particles in the same frame.

**Why it travels:** it's the same structural claim as the depth-into-lighting post (two stages, one encoder, no round-trip) but the output is dramatically louder. Depth-aware lighting is a subtle shading change. Half a million particles being physically dragged by your hand is legible from a thumbnail with the sound off.

**Draft post (write this before any code):**
> Optical flow → particle advection in one command encoder. The flow field is written by a compute pass and read by the next one; it never touches the CPU. 512k particles, 4.1 ms total GPU time on an M4 Pro — and 11 ms on my phone, in Chrome, no app. Wave at your webcam and the world moves.

That's the deliverable. Everything below exists to make that paragraph true.

---

## 1. The frame, end to end

Everything in this list happens inside **one** `device.createCommandEncoder()` and **one** `queue.submit()`. Say that explicitly in the README and show the code — a screenshot of the encoder block is half the post.

```
1. camera frame        → external texture / copyExternalImageToTexture
2. preprocess          → grayscale + census transform + 4-level pyramid  [compute]
3. flow                → LK pyramid refinement  OR  tiny NN forward      [compute × N]
4. flow post           → forward-backward consistency mask,
                         temporal EMA, magnitude clamp                   [compute]
5. advection           → p += bilinear(flow, p) * gain * dt
                         + curl-noise ambient + lifetime respawn         [compute]
6. draw                → instanced quads, additive, velocity streaks     [render]
```

Ping-pong two particle buffers (read A, write B, swap) and two flow textures (previous for EMA).

---

## 2. Flow: do it twice, in this order

**Phase 1 — classical (week 1).** Pyramidal Lucas–Kanade, entirely in WGSL. No model, no weights, no training. This gets you a working, beautiful, postable demo in days rather than weeks, and it de-risks everything downstream: if the particles look bad, you'll know it's the advection or the masking, not the network.

Before flow work begins, the M0 visual-foundation human gate must be approved.
After classical flow is functional, agents must pause for the M1A real-camera
flow-quality review and M1B aesthetic review. Automated tests and debug views do
not replace these reviews.

- 4-level Gaussian pyramid, coarse-to-fine
- Per level: solve the 2×2 LK system per pixel over a 7×7 window using image gradients, warp by the upsampled coarse flow, iterate 3×
- Reject where the structure tensor determinant is below threshold (aperture problem / flat regions) — write the confidence into flow.z

**Phase 2 — learned (week 2–3).** Swap in a small network and show the delta. Options in order of effort:
- **NeuFlow-v2** — explicitly designed for edge latency, closest thing to a drop-in
- A **distilled student**: train a tiny 4-level correlation net against RAFT-small pseudo-labels on FlyingChairs + a few thousand frames of your own webcam footage. Single rented GPU is enough for this; a small student on Chairs is hours, not days.
- Whatever the current fast-flow SOTA is when you start — check before committing

These are candidates, not an advance model selection. Before downloading model
weights or datasets, accepting licenses, renting compute, training, or committing
to an architecture, stop at human gate M3A with a current comparison of the
options. Comparative accuracy and performance claims require M3B approval.

If `onnx2wgsl` is done by then, **run the flow net through it.** The two projects compose, and "the network was compiled by my own compiler" is a strictly better post than either alone. If it isn't done, hand-write the kernels; a 4-level correlation net is maybe 15 ops.

### The failure mode that will actually bite you

Webcam flow is noisy in ways that turn particles to mush:

| Problem | Fix |
|---|---|
| Auto-exposure/white-balance breaks brightness constancy | **Census transform** (or gradient-domain matching) instead of raw intensity — this one fix matters more than anything else on this list |
| Flat regions produce garbage flow | Confidence from structure tensor / forward-backward consistency; multiply advection gain by confidence |
| Rolling shutter on phones | Accept it; it's a mild shear, not a killer |
| Frame-to-frame jitter | Temporal EMA on the flow field (α ≈ 0.7), plus magnitude clamp |
| Whole-frame motion when the camera moves | Optional: subtract the median flow to isolate *relative* motion. Makes handheld phone demos much better |

Budget real time for masking and smoothing. This is where the demo goes from "interesting" to "hypnotic," and it's the part that's tempting to skip.

---

## 3. Particles

- **Count:** target 512k, ship whatever holds 60 fps. Store as two SoA storage buffers (`pos: vec2<f32>`, `vel: vec2<f32>`, `age: f32`, `seed: u32`) — or one interleaved buffer of 32-byte structs, which is friendlier to coalescing.
- **Advection:** `vel = mix(vel, bilinear(flow, pos) * gain * conf, damping); pos += vel * dt;`
- **Ambient motion:** add curl noise at low amplitude so the field is alive even when nothing moves. Critical — a static demo reads as broken.
- **Respawn:** age out and respawn at a random position, or respawn where flow magnitude is high (particles accumulate around motion — visually stronger, choose by taste).
- **Render:** instanced quads or point sprites, additive blending, size by speed, color by flow direction (HSV of flow angle is the classic and it's classic because it looks good). Streak the quads along the velocity vector for free motion blur.

Aesthetic call worth making early: dark background, single-hue particles, and let *density* carry the image. Rainbow flow-direction coloring is more informative but reads as a debug view. Consider shipping both with a toggle and putting the pretty one in the video.

This is explicitly a human aesthetic decision. An agent may implement controls
and present options, but must not select the shipped look without M0/M1B human
approval.

---

## 4. Second variant (cheap, doubles the reach)

Once flow is in a texture, feed it to a **real motion-blur post pass** on rendered 3D geometry instead of particles. Pitch: *"your motion blur is using the world's actual optical flow, not the engine's velocity buffer."* Graphics people will argue about it, which is its own distribution channel.

Cost: maybe a day, since the flow half already exists. Don't build it until the particle version has shipped.

This variant is optional scope. Do not implement it merely because the particle
version is complete; first stop at M4 and obtain a human scope decision.

---

## 5. Numbers to put in the post

Break down GPU time per stage using `timestamp-query`:

| Stage | ms (M4 Pro) | ms (phone) |
|---|---|---|
| pyramid + census | | |
| flow | | |
| flow post | | |
| advection (512k) | | |
| draw | | |
| **total** | | |

Plus: flow resolution, particle count, frame time, device, browser. **Get the phone row.** WebGPU on Android Chrome is where the novelty gap is right now, and "no app, just a URL" is the strongest version of this claim.

Benchmark rows must come from identified physical devices and browsers. Agents
may collect and format measurements, but a human must verify them and approve
the compatibility/performance policy at M2A and all public claims at M2B.

**Accuracy table (Phase 2 only):** EPE on Sintel clean/final and KITTI-15 vs RAFT reference, alongside latency. This keeps the project honest and makes it citable rather than just pretty. Classical LK will lose badly on EPE — publish that anyway, it's the setup for the learned version's improvement.

---

## 6. Milestones

This section is the high-level sequence. The authoritative acceptance criteria,
stop conditions, and human gates are in [MILESTONES.md](./MILESTONES.md). A phase
is not complete until its associated human gate is recorded as approved.

**M0 — Moving pixels (2 days).** Camera → WebGPU texture, 512k particles, curl noise only, one encoder, instanced draw. *Exit: something beautiful on screen that has nothing to do with flow yet.*

**Pause: HUMAN GATE M0** — approve the visual foundation and interaction before
flow integration.

**M1 — Flow, classical (4 days).** LK pyramid in WGSL, census transform, confidence mask, EMA, wired into advection. *Exit: waving your hand visibly drags particles, no mush. **This is the postable clip — record it here, not later.***

**Pause: HUMAN GATES M1A and M1B** — test flow on real cameras, approve tuning,
then approve the presentation aesthetic.

**M2 — Ship (2 days).** Timing breakdown, phone build, GitHub Pages demo, README, 15-second wordless recording, post.

**Pause: HUMAN GATES M2A and M2B** — set compatibility/performance policy, then
verify claims and explicitly authorize deployment and publication. Agents may
prepare release artifacts but must not publish them before approval.

**M3 — Learned flow (5–7 days).** Swap in NeuFlow-v2 or a distilled student, EPE table, side-by-side comparison video, second post.

**Pause twice:** M3A occurs before model/data acquisition, licensing, spending,
or training; M3B occurs before publishing the learned-flow comparison.

**M4 — Camera motion blur and depth × flow.** Implement the two independently
toggleable tracks described in [M4_PLAN.md](./M4_PLAN.md): measured-flow motion
blur first, then relative monocular depth driving layered particles and
occlusion boundaries. Do not describe the latter as full scene flow.

**Pause: HUMAN GATES M4A, M4B-Model, M4B-Visual, and M4R** — approve blur
character, depth model/license acquisition, depth presentation, and release
claims at their respective stages.

Total to first post: ~8 days. Total to second post: ~3 weeks.

Note the shape: **M2 ships before the interesting research part exists.** That's deliberate. Ship the classical version, take the traction, then post the learned version as a follow-up to an audience that already exists. Two posts from one repo.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Flow too noisy → particles look like static | Census transform + confidence mask + EMA. Budget a full day for tuning; this *is* the project |
| WebGPU camera path differs across browsers | `importExternalTexture` on Chrome; fall back to `copyExternalImageToTexture` from a `<video>` element. Test Safari early — it's the most likely to break |
| Phone thermal throttling mid-demo | Record the clip on a cool device; report sustained numbers separately from peak if they differ |
| 512k particles too many for mobile | Adaptive count based on measured frame time; report both |
| "This is just a particle toy" | The timing table and the one-encoder code screenshot are what elevate it. Lead with the mechanism, not the visuals |

---

## 8. Repo layout

```
flowfield/
├── src/
│   ├── shaders/
│   │   ├── pyramid.wgsl        # grayscale, census, downsample
│   │   ├── lk.wgsl             # per-level LK solve + warp
│   │   ├── flow_post.wgsl      # fb-consistency, EMA, clamp
│   │   ├── advect.wgsl         # particle update
│   │   └── draw.wgsl           # instanced quad vs/fs
│   ├── frame.js                # THE ENCODER — one function, keep it readable
│   ├── camera.js
│   └── params.js               # tweakpane-style live controls
├── bench/                      # timestamp-query harness
├── eval/                       # Sintel/KITTI EPE (M3)
├── index.html                  # the demo IS the repo
└── README.md
```

Keep `frame.js` short and beautiful. It's the file people will click into after watching the video, and a clean 60-line encoder function is more persuasive than any paragraph of README.
