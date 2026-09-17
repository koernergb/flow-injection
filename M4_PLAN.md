# M4 Plan — Real-World Motion Blur and Depth × Flow

This plan defines two optional extensions to the shipped classical-flow demo.
Local, reversible prototypes may begin after explicit M4 scope authorization.
M2B remains required before publication, deployment, or benchmark claims. Each
track must still stop at its relevant M4 human gates. Both tracks preserve the core architectural claim: camera processing,
flow/depth inference, simulation, post-processing, and drawing happen in one
`GPUCommandEncoder` and one `queue.submit()` per frame.

## Product intent

### Track A — Real-world motion blur

Use optical flow measured from the live camera as a screen-space velocity field
for a true post-process blur. The result should make real movement smear in its
measured direction and distance, rather than placing a generic animated effect
over the webcam.

The first version operates on the camera image. A later demo scene may combine
camera flow with rendered geometry, but that is separate scope because a camera
velocity field does not automatically describe an unrelated 3D scene.

### Track B — Depth × flow

Estimate monocular depth from the live camera, combine it with optical flow, and
use the result to make particle motion spatially layered. Near and far surfaces
should respond differently, occlusion boundaries should remain legible, and
particles should appear to move through a shallow volume rather than across a
flat screen.

This is not full metric scene flow. Without camera calibration, scale, and a
temporal 3D reconstruction, the system produces a depth-conditioned 2D motion
field. Public wording must retain that distinction.

## Shared constraints

- Preserve classical optical flow as the default and fallback.
- Keep camera pixels and inferred fields local to the device.
- Never read full-resolution flow or depth back to the CPU during normal frames.
- Add each feature behind an independent runtime toggle.
- Reuse the existing adaptive-quality controller; feature overload must reduce
  resolution or sample count before it breaks interaction.
- Report unsupported model operators, memory allocation failures, and camera
  interruptions clearly; do not silently show a misleading approximation.
- Do not download depth weights, accept a model license, or add a hosted inference
  dependency before human approval.

## Track A implementation stages

### M4A.1 — Blur prototype

1. Render the current camera/presentation result into an intermediate color
   texture instead of directly to the swapchain.
2. Convert optical flow from analysis pixels per camera frame into display UV
   displacement, accounting for crop, mirror, aspect ratio, and frame cadence.
3. Add a gather blur compute or render pass. Sample symmetrically along the flow
   vector, with configurable shutter angle, maximum radius, and sample count.
4. Weight samples by flow confidence so flat/noisy regions remain stable.
5. Composite the blurred result to the swapchain inside the existing encoder.

### M4A.2 — Boundary quality

- Add a color/luma edge rejection term so foreground color does not bleed far
  across unrelated surfaces.
- Compare symmetric blur with directionally trailing blur.
- Stabilize blur length using the filtered flow field while retaining a fast
  response to new motion.
- Add a debug view showing vectors, confidence, and the final sampling span.

### M4A.3 — Performance and validation

- Quality tiers: 5, 9, and 13 taps; half-resolution blur is allowed as a lower
  tier if upsampling artifacts are documented.
- Add GPU timing for blur and composite.
- Test stillness, hand motion, face motion, global camera motion, dim light,
  rapid exposure changes, resize, and camera restart.
- Verify that zero or rejected flow produces an unblurred image.

### Track A acceptance criteria

- Blur direction follows observed motion in synthetic translations and a live
  camera test.
- Blur length scales consistently across camera and display resolutions.
- A still scene remains visibly sharp and does not shimmer.
- Boundary bleeding is acceptable in human-reviewed face/hand tests.
- The adaptive policy maintains the M2A performance target or exposes an honest
  lower-quality state.
- No extra command encoder or queue submission is introduced.

### HUMAN GATE M4A — Blur character

**Agent must pause after the prototype and before final tuning.** A human chooses:

- camera-only blur or a separately scoped rendered-scene demonstration;
- symmetric shutter blur or trailing/expressive blur;
- maximum blur strength and preferred quality tier; and
- whether boundary artifacts are acceptable or require more work.

## Track B implementation stages

### M4B.0 — Model decision packet

Research at most three current browser-feasible monocular depth models. For each,
record license, provenance, input resolution, download size, WebGPU operator
coverage, expected GPU memory, target latency, output convention, and known bias.
Prepare representative still-image outputs without acquiring restricted assets.

### HUMAN GATE M4B-Model — Depth model and license

**Agent must pause before downloading or converting weights.** A human approves
the model, license, acquisition source, size budget, supported devices, and
whether local-only inference is mandatory. If no candidate fits, Track B stops.

### M4B.1 — Depth inference foundation

1. Add a modular depth provider with `disabled`, `model`, and deterministic test
   implementations.
2. Convert the approved network into WebGPU-compatible kernels or an approved
   local runtime; no server inference is assumed.
3. Run depth at an independently tunable resolution and cadence.
4. Normalize relative inverse depth robustly using clipped percentiles or an
   equivalent GPU reduction; do not imply metric distance.
5. Temporally stabilize depth and reject abrupt low-confidence changes.
6. Add grayscale depth and depth-edge debug views.

### M4B.2 — Depth-conditioned flow and particles

- Upsample depth edge-aware into the flow/particle coordinate systems.
- Compute depth gradients and an occlusion-boundary mask.
- Store particle pseudo-depth and use it to vary parallax, size, brightness,
  lifetime, and camera-flow gain.
- Attenuate or redirect cross-boundary advection so particles do not freely leak
  between foreground and background layers.
- Add depth-slice respawning so the volume remains populated.
- Provide a conservative `Depth Layers` mode alongside the existing three modes;
  do not replace their approved defaults.

### M4B.3 — Optional camera-motion separation

Estimate a robust dominant 2D transform from confident flow and background depth,
then subtract it to emphasize independently moving subjects. This is explicitly
an approximation, not six-degree-of-freedom camera tracking. It remains off by
default until a human compares handheld and fixed-camera behavior.

### M4B.4 — Performance and validation

- Add timings for depth inference, stabilization/upsampling, boundary generation,
  and depth-conditioned advection.
- Allow depth cadence and resolution to step down independently of particle count.
- Test near/far objects, depth edges, mirrors/screens, low texture, dim light,
  rapid motion, and partial occlusion.
- Record memory use or a defensible allocation estimate by resource.
- Compare depth disabled/enabled on desktop and Android physical hardware.

### Track B acceptance criteria

- Deterministic depth ramps and masks produce the expected particle layering and
  boundary behavior.
- A human can distinguish near and far response without seeing the debug view.
- Depth flicker does not dominate a still scene.
- Occlusion boundaries reduce particle leakage relative to the baseline.
- Failure or overload falls back to classical flow without losing the camera.
- The chosen supported tier meets an explicitly approved sustained frame target.
- UI and documentation call the output relative monocular depth, not metric depth
  or full scene flow.

### HUMAN GATE M4B-Visual — Depth behavior

**Agent must pause after integration.** A human chooses the strength of parallax,
layer separation, depth-based size/brightness, boundary stiffness, and whether
camera-motion separation belongs in the default presentation.

## Proposed execution order

1. Complete M2B and publish the classical baseline if authorized.
2. Implement Track A through M4A; it reuses the existing flow field and has no
   model/licensing dependency.
3. Prepare the M4B model decision packet and stop at M4B-Model.
4. Implement the approved depth foundation, then depth-conditioned particles.
5. Stop at M4B-Visual for real-camera aesthetic judgment.
6. Benchmark both features separately and together.
7. Stop at M4R before making public performance, depth, or scene-flow claims.

Track A must remain usable without Track B. Track B may reuse Track A's
intermediate color target, but it must not require motion blur to function.

## Final release gate

### HUMAN GATE M4R — Variant release and claims

A human verifies physical-device results and approves supported-browser wording,
privacy language, recordings, comparisons, and any use of “real-world motion
blur,” “depth,” or “scene flow.” Agents must not deploy these variants, publish
benchmarks, or tag a release before approval.
