export const defaults = Object.freeze({
  particleCount: 262_144,
  adaptiveQuality: 1,
  pointSize: 2.2,
  ambient: 0.12,
  damping: 0.965,
  flowGain: 1.8,
  flowSmoothing: 0.7,
  flowClamp: 14,
  confidenceThreshold: 0.015,
  styleMode: 0,
  showFlow: 0,
  motionBlur: 0,
  blurStrength: 2,
  blurQuality: 1,
  blurEdgeRejection: 8,
});

const definitions = [
  ["particleCount", "Particle quality", 65_536, 262_144, 65_536],
  ["adaptiveQuality", "Adaptive quality", 0, 1, 1],
  ["pointSize", "Particle size", 0.8, 5, 0.1],
  ["ambient", "Ambient motion", 0, 1, 0.01],
  ["damping", "Damping", 0.85, 0.995, 0.001],
  ["flowGain", "Camera force", 0, 5, 0.05],
  ["flowSmoothing", "Flow smoothing", 0, 0.95, 0.01],
  ["flowClamp", "Flow clamp", 2, 30, 0.5],
  ["confidenceThreshold", "Confidence", 0, 0.1, 0.001],
  ["styleMode", "Visual mode", 0, 2, 1],
  ["showFlow", "Flow debug", 0, 1, 1],
  ["motionBlur", "Real-world blur", 0, 1, 1],
  ["blurStrength", "Blur shutter", 0, 6, 0.1],
  ["blurQuality", "Blur quality", 0, 2, 1],
  ["blurEdgeRejection", "Blur edge guard", 0, 20, 0.5],
];

export function createControls(container, initial = defaults) {
  const values = { ...initial };
  const controls = new Map();

  for (const [key, label, min, max, step] of definitions) {
    const row = document.createElement("label");
    row.className = "control";
    const name = document.createElement("span");
    const output = document.createElement("output");
    const input = document.createElement("input");
    name.textContent = label;
    output.value = format(key, values[key]);
    input.type = "range";
    Object.assign(input, { min, max, step, value: values[key] });
    input.addEventListener("input", () => {
      values[key] = Number(input.value);
      output.value = format(key, values[key]);
    });
    controls.set(key, { input, output });
    row.append(name, output, input);
    container.append(row);
  }

  Object.defineProperty(values, "set", {
    enumerable: false,
    value(key, value) {
      const control = controls.get(key);
      if (!control) return;
      values[key] = value;
      control.input.value = value;
      control.output.value = format(key, value);
    },
  });

  return values;
}

function format(key, value) {
  if (key === "particleCount") return ["low", "balanced", "high", "ultra"][Math.round(value / 65_536) - 1];
  if (key === "adaptiveQuality") return value > 0 ? "auto" : "manual";
  if (key === "damping" || key === "confidenceThreshold") return value.toFixed(3);
  if (key === "styleMode") return ["ghost", "electric", "silhouette"][Math.round(value)];
  if (key === "showFlow") return value > 0 ? "on" : "off";
  if (key === "motionBlur") return value > 0 ? "on" : "off";
  if (key === "blurQuality") return ["5 taps", "9 taps", "13 taps"][Math.round(value)];
  return value.toFixed(2);
}
