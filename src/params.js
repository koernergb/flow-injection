export const defaults = Object.freeze({
  particleCount: 262_144,
  pointSize: 2.2,
  ambient: 0.34,
  damping: 0.965,
  cameraOpacity: 0.12,
});

const definitions = [
  ["pointSize", "Particle size", 0.8, 5, 0.1],
  ["ambient", "Ambient motion", 0, 1, 0.01],
  ["damping", "Damping", 0.85, 0.995, 0.001],
  ["cameraOpacity", "Camera ghost", 0, 0.4, 0.01],
];

export function createControls(container, initial = defaults) {
  const values = { ...initial };

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
    row.append(name, output, input);
    container.append(row);
  }

  return values;
}

function format(key, value) {
  if (key === "damping") return value.toFixed(3);
  return value.toFixed(2);
}
