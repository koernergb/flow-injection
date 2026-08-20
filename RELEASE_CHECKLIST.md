# Flow Injection — Release Checklist

This checklist prepares a release but does not authorize one.

## Engineering

- [ ] `npm test`, `npm run check`, and `npm run build` pass at the release commit.
- [ ] No WebGPU validation or shader-compilation errors occur.
- [ ] Camera approval, denial, restart, resize, and orientation changes work.
- [ ] Timestamp-query unsupported fallback displays `GPU n/a` cleanly.
- [ ] Adaptive quality does not oscillate or hide the active particle count.
- [ ] Ghost Current, Electric Flow, Silhouette Field, and Flow Debug all work.
- [ ] One `createCommandEncoder()` and one `queue.submit()` remain in the frame.

## Physical-device review

- [ ] Desktop Chrome tested and recorded.
- [ ] Android Chrome tested and recorded.
- [ ] Phone camera test uses a secure context; plain LAN HTTP is not reported as a browser failure.
- [ ] Safari tested or its limitation documented accurately.
- [ ] Five-minute sustained performance and thermal behavior recorded.
- [ ] Bright and dim lighting tested.

## Claims and privacy

- [ ] Benchmark table contains no placeholder or unverified values.
- [ ] Device, OS, browser/version, particle count, and flow resolution accompany every number.
- [ ] Webcam frames remain local and no analytics or network upload is introduced.
- [ ] Limitations of classical Lucas–Kanade flow are stated plainly.
- [ ] Recording and post copy are approved by a human.

## Publication

- [ ] Human Gate M2A approved.
- [ ] Human Gate M2B explicitly authorizes deployment and publication.
- [ ] GitHub Pages workflow dispatched manually only after M2B.
- [ ] Release tag and public post created only after M2B.
