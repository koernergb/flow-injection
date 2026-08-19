# Flow Injection — Human Judgment Guide

This project deliberately separates implementation work from decisions that
require taste, physical-device observation, product ownership, or permission to
publish. Agents may prepare options and evidence. They must not manufacture an
approval or infer one from silence.

## What belongs to the human

### Visual quality and feel

Only a human can approve whether the demo feels responsive, coherent, and worth
showing. This includes particle density, palette, blending, trails, idle motion,
flow gain, smoothing, confidence thresholds, respawn behavior, and the choice of
the primary presentation mode.

Agents should expose useful controls, suggest a small set of defaults, and
provide screenshots or recordings when possible. The human chooses the result.

### Real-device experience

Webcam behavior, perceived latency, thermal throttling, permission UX, and
mobile browser behavior require observation on the actual target hardware. An
automated check or desktop emulation is not a substitute.

The human should test:

- representative hand and body motion;
- still scenes and flat backgrounds;
- bright, dim, and changing light;
- camera permission approval and denial;
- resize, orientation change, backgrounding, and camera restart; and
- sustained use long enough to reveal thermal throttling.

### Product and scope choices

The human owns decisions that change the promise or scope of the project:

- changing the one-encoder/one-submit claim;
- selecting supported browsers and minimum performance targets;
- choosing classical versus learned flow as the default;
- choosing a model, dataset, license, paid service, rented compute, or training
  budget;
- accepting a quality/performance tradeoff;
- adding optional variants; and
- deciding what is ready to ship.

### Public claims and external actions

The human must verify benchmark numbers and approve statements about speed,
accuracy, device support, privacy, and comparisons with other systems. Only the
human can authorize deployment, publication, release tags, social posts, paid
resources, or other external commitments.

## What the agent should do before a gate

An agent should make the decision easy to evaluate. Before pausing, it should:

1. finish all safe implementation and automated verification in the current
   milestone;
2. state exactly which gate has been reached;
3. provide a runnable command or URL and a short test script;
4. list the relevant controls and current defaults;
5. present no more than three meaningful options when a choice is needed;
6. summarize measurements, known limitations, and its recommendation; and
7. identify the files or values that will change after approval.

## How the agent must pause

At a human gate, the agent must stop dependent implementation and ask for an
explicit decision. It may continue unrelated, reversible work that cannot bias
or pre-empt the decision, such as documentation cleanup or additional tests.

The agent must not:

- treat a passing test as visual approval;
- pick aesthetic defaults merely because they are technically valid;
- claim testing on hardware a human has not actually tested;
- silently reduce quality or change the core architectural claim to meet a
  performance target;
- download restricted datasets or model weights, incur costs, or accept licenses
  without approval;
- deploy or publish because a build is technically ready; or
- mark a milestone complete while its human gate is unresolved.

When blocked at a gate, report the state as **awaiting human judgment**, not as a
failure.

## How the human should respond

A useful response names the gate and gives one of these decisions:

- **Approved** — proceed with the demonstrated settings or proposal.
- **Approved with changes** — proceed after applying listed changes.
- **Changes requested** — revise and return to the same gate.
- **Deferred** — preserve the current state and do not begin dependent work.

Short feedback is fine. For visual gates, concrete comparisons such as “less
ambient drift,” “option B's color with option A's trails,” or “prioritize phone
smoothness over density” are more actionable than implementation instructions.

## Gate checklist

| Gate | Human decision | Implementation blocked until approval |
|---|---|---|
| M0 | Visual foundation and interaction | Optical-flow integration |
| M1A | Real-camera flow quality and tuning | Final aesthetic tuning |
| M1B | Presentation aesthetic | Release preparation |
| M2A | Compatibility and performance policy | Final release candidate |
| M2B | Claims, privacy, deployment, publication | Any public release |
| M3A | Model, data, licenses, cost | Learned-flow acquisition/training |
| M3B | Accuracy/latency tradeoff and claims | Learned-flow release |
| M4 | Optional feature scope | Optional variant implementation |

## Judgment record

Human decisions should be written down with the tested commit, devices, browser
versions, decision, selected settings, and requested follow-up. This prevents a
later implementation pass from accidentally undoing an intentional choice.

