import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = [
  "index.html", "styles.css", "src/main.js", "src/camera.js", "src/gpu.js",
  "src/frame.js", "src/params.js", "src/shaders/ambient.wgsl",
  "src/shaders/draw.wgsl", "src/shaders/camera.wgsl",
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

for (const file of files.filter((name) => name.endsWith(".js"))) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

process.stdout.write("M0 structural checks passed.\n");
