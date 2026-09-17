import { startCamera } from "./camera.js";
import { createGpu, resizeCanvas } from "./gpu.js";
import { createRenderer } from "./frame.js";
import { createControls, defaults } from "./params.js";

const canvas = document.querySelector("#canvas");
const video = document.querySelector("#camera");
const status = document.querySelector("#status");
const statusTitle = document.querySelector("#status-title");
const statusDetail = document.querySelector("#status-detail");
const retry = document.querySelector("#retry");
const fps = document.querySelector("#fps");
const gpuTime = document.querySelector("#gpu-time");
const cameraState = document.querySelector("#camera-state");
const particleCountLabel = document.querySelector("#particle-count");
const toggle = document.querySelector("#controls-toggle");
const controlsBody = document.querySelector("#controls-body");
const params = createControls(controlsBody);

let cleanup = () => {};

toggle.addEventListener("click", () => {
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!expanded));
  controlsBody.hidden = expanded;
});
retry.addEventListener("click", boot);
window.addEventListener("beforeunload", () => cleanup());

boot();

async function boot() {
  cleanup();
  cameraState.textContent = "camera pending";
  retry.hidden = true;
  showStatus("Preparing the GPU…", "Camera permission will be requested next.");

  try {
    const gpu = await createGpu(canvas);
    let camera;
    try {
      showStatus("Enable the camera", "Video stays in this page and is sampled directly by the GPU.");
      camera = await startCamera(video);
      cameraState.textContent = "camera local";
    } catch (error) {
      camera = { video, stop() {} };
      cameraState.textContent = "camera unavailable";
      cameraState.title = error.message;
    }

    const renderer = await createRenderer({
      ...gpu,
      video: camera.video,
      particleCount: defaults.particleCount,
      onTimings(timings) {
        if (!timings) {
          gpuTime.value = "GPU n/a";
          gpuTime.title = "Timestamp queries are unavailable on this device.";
          return;
        }
        gpuTime.value = `GPU ${timings.total.toFixed(1)} ms`;
        gpuTime.title = `preprocess ${timings.preprocess.toFixed(2)} · flow ${timings.flow.toFixed(2)} · post ${timings.flowPost.toFixed(2)} · advection ${timings.advection.toFixed(2)} · composite ${timings.composite.toFixed(2)} · draw ${timings.draw.toFixed(2)} ms`;
      },
    });
    let running = true;
    let animationFrame = 0;
    let previous = performance.now();
    let sampleStart = previous;
    let sampleFrames = 0;
    let lastQualityChange = previous;

    cleanup = () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      renderer.destroy();
      camera.stop();
    };
    gpu.device.lost.then((info) => {
      cleanup();
      fail("The GPU device was lost.", info.message || "Reload the page to request a new device.");
    });

    hideStatus();
    const frame = (now) => {
      if (!running) return;
      resizeCanvas(canvas, gpu.device);
      const dt = Math.min((now - previous) / 1000, 1 / 20);
      previous = now;
      renderer.render({
        dt,
        time: now / 1000,
        width: canvas.width,
        height: canvas.height,
        params,
      });
      particleCountLabel.textContent = `${Math.round(params.particleCount).toLocaleString()} particles`;

      sampleFrames += 1;
      if (now - sampleStart >= 500) {
        const measuredFps = sampleFrames * 1000 / (now - sampleStart);
        fps.value = `${Math.round(measuredFps)} fps`;
        if (params.adaptiveQuality > 0 && now - lastQualityChange > 2500) {
          if (measuredFps < 50 && params.particleCount > 65_536) {
            params.set("particleCount", Math.max(65_536, params.particleCount - 65_536));
            lastQualityChange = now;
          } else if (measuredFps > 58 && params.particleCount < 262_144) {
            params.set("particleCount", Math.min(262_144, params.particleCount + 65_536));
            lastQualityChange = now;
          }
        }
        sampleFrames = 0;
        sampleStart = now;
      }
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
  } catch (error) {
    fail("Flow Injection could not start.", error.message);
  }
}

function showStatus(title, detail) {
  status.dataset.hidden = "false";
  statusTitle.textContent = title;
  statusDetail.textContent = detail;
}

function hideStatus() {
  status.dataset.hidden = "true";
}

function fail(title, detail) {
  showStatus(title, detail);
  retry.hidden = false;
}
