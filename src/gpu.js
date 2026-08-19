export async function createGpu(canvas) {
  if (!navigator.gpu) throw new Error("WebGPU is not available. Try a current Chrome, Edge, or Safari release.");

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("No compatible GPU adapter was found.");

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("Could not create a WebGPU canvas context.");
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format, alphaMode: "opaque" });
  return { adapter, device, context, format };
}

export function resizeCanvas(canvas, device) {
  const max = device.limits.maxTextureDimension2D;
  const width = Math.min(max, Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio)));
  const height = Math.min(max, Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio)));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}
