# Flow Injection — Decision Record

### Gate: M1A — Flow quality

- Date: 2026-08-19
- Reviewer: project owner
- Build/commit: M1 draft on `agent/implement-m0-webgpu-foundation`
- Decision: approved
- Observations: the webcam-driven particle response communicates the intended interaction; proceed to presentation work.
- Required follow-up: retain flow tuning controls for later device and lighting checks.

### Gate: M1B — Aesthetic direction

- Date: 2026-08-19
- Reviewer: project owner
- Decision: approved with three toggleable modes
- Default: Ghost Current
- Additional modes: Electric Flow and Silhouette Field
- Scope: the modes may vary palette, streak behavior, camera/ambient balance, and respawn strategy while preserving the same GPU flow pipeline and one-encoder frame.
- Result: implemented and visually accepted by the project owner.

### Gate: M2A — Compatibility and performance policy

- Date: 2026-08-19
- Reviewer: project owner
- Decision: approved
- Performance target: 60 fps
- Adaptive thresholds: step down below 50 fps; step up above 58 fps
- Particle tiers: 65,536; 131,072; 196,608; 262,144
- Default presentation: Ghost Current
- Initial supported targets: Chromium-family desktop browsers and Android Chrome
- Safari policy: describe as unverified until tested on physical hardware
- Required follow-up: collect and verify desktop and phone benchmark rows before Human Gate M2B.

### M4 local scope authorization

- Date: 2026-08-20
- Reviewer: project owner
- Decision: authorize local implementation of both real-world motion blur and depth × flow.
- Publication status: not authorized; M2B and M4R remain unresolved.
- Required pauses: M4A after the blur prototype; M4B-Model before depth-weight acquisition; M4B-Visual after depth integration.
