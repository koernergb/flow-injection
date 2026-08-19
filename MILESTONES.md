# Flow Injection — Implementation Milestones

This file is the execution plan for the project. The build brief explains the
idea; this file defines the order of work, the evidence required to call a
milestone complete, and the points where implementation must stop for human
judgment.

## Working rules

- Work on only one milestone at a time.
- Keep the frame in one `GPUCommandEncoder` and one `queue.submit()` unless a
  human explicitly approves a change to that core claim.
- Do not begin the next milestone until the current milestone's automated
  checks pass and its human gate is approved.
- Record decisions and measured results in the repository. Do not substitute an
  agent's visual preference for a human review.
- If a required device, browser, camera, benchmark, or visual review is not
  available, stop and report what is missing. Do not mark the gate complete.

The detailed review procedure and decision ownership are in
[HUMAN_JUDGMENT.md](./HUMAN_JUDGMENT.md).

## M0 — Project shell and GPU proof

### Goal

Establish a minimal, understandable WebGPU application before implementing
optical flow.

### Agent implementation

- Create the application shell, development scripts, and concise README.
- Acquire webcam permission and display a clear permission/error state.
- Initialize WebGPU and report unsupported-browser/device failures.
- Allocate ping-pong particle buffers for a configurable particle count.
- Implement compute-driven curl-noise motion and instanced particle rendering.
- Keep the frame encoder readable and ensure there is exactly one submit per
  rendered frame.
- Add basic controls for particle count, point size, gain, damping, and ambient
  motion.

### Verification evidence

- Build and static checks pass.
- The app starts without console or validation errors.
- Particles update and render using GPU compute.
- Resize, camera denial, and WebGPU-unavailable states are handled.
- The encoder structure is documented in the README.

### HUMAN GATE M0 — Visual foundation and interaction

**Agent must pause here.** A human runs the demo and decides:

- whether the idle motion looks alive rather than noisy or distracting;
- whether particle density, size, color, blending, and trails form a suitable
  visual foundation;
- whether webcam permission and failure states feel acceptable; and
- which visual defaults should be carried into flow integration.

Record the approved defaults and feedback before starting M1.

## M1 — Classical optical flow

### Goal

Make visible movement in the webcam reliably drag the particles while keeping
all image processing, flow, advection, and drawing on the GPU.

### Agent implementation

- Upload or import the camera frame using a documented browser-compatible path.
- Implement grayscale preprocessing, census or gradient-domain matching, and a
  four-level image pyramid.
- Implement coarse-to-fine pyramidal Lucas–Kanade flow in WGSL.
- Write confidence from the structure tensor or equivalent rejection test.
- Implement flow post-processing: temporal EMA, magnitude clamp, and confidence
  masking.
- Bilinearly sample flow during particle advection.
- Add a flow debug view and controls for thresholds, smoothing, clamp, gain, and
  ambient contribution.
- Preserve the one-encoder, one-submit frame structure.

### Verification evidence

- Synthetic translation cases produce the expected flow direction and
  approximately correct magnitude.
- Flat regions have low confidence.
- No WebGPU validation errors occur during normal use, resize, or camera restart.
- Debug views make raw flow, confidence, and filtered flow inspectable.
- A timing readout separates preprocessing, flow, post-processing, advection,
  and drawing when timestamp queries are supported.

### HUMAN GATE M1A — Flow quality

**Agent must pause here.** A human tests real webcam motion under at least two
lighting conditions and decides whether hand motion is legible, stable, and
responsive enough. The human selects or approves the default confidence,
smoothing, magnitude, and gain values.

### HUMAN GATE M1B — Aesthetic direction

**Agent must pause again after M1A adjustments.** A human chooses the primary
presentation mode, including monochrome versus direction color, background,
particle respawn behavior, streak length, and the balance between ambient and
camera-driven motion.

Do not proceed to shipping work until both M1 gates are recorded as approved.

## M2 — Performance, compatibility, and release

### Goal

Turn the experiment into a reproducible public demo with honest measurements.

### Agent implementation

- Add timestamp-query instrumentation with a graceful unsupported fallback.
- Add adaptive particle counts or explicit quality presets.
- Test and document the external-texture and image-copy camera paths.
- Create a benchmark table template for desktop and phone measurements.
- Write setup, architecture, privacy, compatibility, and troubleshooting docs.
- Prepare deployment configuration and a release checklist.
- Prepare, but do not publish, suggested post copy and capture instructions.

### Verification evidence

- Production build succeeds.
- The app remains usable when timestamp queries are unavailable.
- Benchmark numbers identify device, OS, browser/version, resolution, particle
  count, and whether results are peak or sustained.
- At least one desktop and one supported phone have been tested by a human.
- README claims match observed behavior and recorded measurements.

### HUMAN GATE M2A — Compatibility and performance policy

**Agent must pause here.** A human decides the shipped particle counts, quality
defaults, supported-browser wording, acceptable sustained frame rate, and
whether any problematic platform should be blocked or merely documented.

### HUMAN GATE M2B — Release and truthfulness

**Agent must pause here.** A human verifies the reported numbers on the named
hardware, approves the recording and wording, confirms webcam privacy language,
and explicitly authorizes deployment and publication. Agents must not deploy,
post, push a release tag, or publish benchmark claims without this approval.

## M3 — Learned optical flow

### Goal

Evaluate a compact learned-flow implementation against the classical baseline
without weakening the browser experience or overstating accuracy.

### Agent implementation

- Research current candidate models and document licenses, operator coverage,
  model size, expected accuracy, and browser feasibility.
- Prepare an implementation plan for the selected model or distilled student.
- Add evaluation tooling for Sintel/KITTI only after dataset and license handling
  are approved.
- Integrate the model behind a runtime toggle, preserving classical flow as the
  baseline and fallback.
- Report latency, memory use, and accuracy with reproducible settings.

### HUMAN GATE M3A — Model and data choice

**Agent must pause before downloading weights or datasets, renting compute,
starting training, or committing to an architecture.** A human selects the model
path and approves licenses, data sources, expected cost, and evaluation scope.

### HUMAN GATE M3B — Learned-flow release

**Agent must pause after evaluation.** A human decides whether the visual and
accuracy improvement justifies the size and latency cost, and approves all
comparative claims before release.

## M4 — Optional variants

Motion blur, depth/flow combinations, MIDI, and audio reactivity are separate
scope. Each requires a short proposal containing user value, estimated effort,
performance cost, and impact on the project's core claim.

### HUMAN GATE M4 — Scope selection

**Agent must pause before implementing an optional variant.** A human chooses
which proposal, if any, belongs in this repository and defines its acceptance
criteria.

## Decision record template

Append approved gate decisions to a project decision log or pull request using:

```md
### Gate: M1A — Flow quality
- Date:
- Reviewer:
- Build/commit:
- Devices and browsers tested:
- Decision: approved | changes requested
- Approved defaults:
- Observations:
- Required follow-up:
```

