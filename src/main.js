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
const cameraState = document.querySelector("#camera-state");
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
    });
    let running = true;
    let animationFrame = 0;
    let previous = performance.now();
    let sampleStart = previous;
    let sampleFrames = 0;

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

      sampleFrames += 1;
      if (now - sampleStart >= 500) {
        fps.value = `${Math.round(sampleFrames * 1000 / (now - sampleStart))} fps`;
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
