import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = [
  "index.html", "styles.css", "favicon.svg", "src/main.js", "src/camera.js", "src/gpu.js",
  "src/frame.js", "src/params.js", "src/shaders/advect.wgsl",
  "src/shaders/draw.wgsl", "src/shaders/preprocess.wgsl",
  "src/shaders/downsample.wgsl", "src/shaders/lk.wgsl",
  "src/shaders/flow_post.wgsl", "src/shaders/flow_debug.wgsl",
  "src/shaders/camera_color.wgsl", "src/shaders/motion_blur.wgsl",
];
for (const file of files) readFileSync(file, "utf8");

const frame = readFileSync("src/frame.js", "utf8");
const submitCount = (frame.match(/queue\.submit/g) ?? []).length;
const encoderCount = (frame.match(/createCommandEncoder/g) ?? []).length;
if (submitCount !== 1 || encoderCount !== 1) {
  throw new Error(`frame.js must contain one encoder and one submit; found ${encoderCount}/${submitCount}`);
}
if (!frame.includes("beginComputePass") || !frame.includes("beginRenderPass")) {
  throw new Error("frame.js must encode both compute and render passes");
}
if (!frame.includes("createQuerySet") || !frame.includes("resolveQuerySet")) {
  throw new Error("M2 must retain optional GPU timestamp-query instrumentation");
}

const pagesWorkflow = readFileSync(".github/workflows/pages.yml", "utf8");
if (!pagesWorkflow.includes("workflow_dispatch:") || /^\s+push:/m.test(pagesWorkflow)) {
  throw new Error("Pages deployment must remain manual-only until Human Gate M2B");
}

const preprocessShader = readFileSync("src/shaders/preprocess.wgsl", "utf8");
if (!preprocessShader.includes("texture_external") || !preprocessShader.includes("camera_sampler")) {
  throw new Error("preprocess shader must bind both an external texture and its sampler");
}

for (const file of files.filter((name) => name.endsWith(".js"))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

process.stdout.write("M2 structural checks passed.\n");
