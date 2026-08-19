const PARTICLE_STRIDE = 32;
const WORKGROUP_SIZE = 256;

export async function createRenderer({ device, context, format, video, particleCount }) {
  const [computeSource, drawSource, cameraSource] = await Promise.all([
    loadShader("./src/shaders/ambient.wgsl"),
    loadShader("./src/shaders/draw.wgsl"),
    loadShader("./src/shaders/camera.wgsl"),
  ]);

  const uniformBuffer = device.createBuffer({
    label: "frame uniforms",
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const particleBuffers = [0, 1].map((index) => device.createBuffer({
    label: `particles ${index}`,
    size: particleCount * PARTICLE_STRIDE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }));
  seedParticles(device, particleBuffers, particleCount);

  const [computeModule, drawModule, cameraModule] = await Promise.all([
    checkedShaderModule(device, "ambient compute", computeSource),
    checkedShaderModule(device, "particle draw", drawSource),
    checkedShaderModule(device, "camera background", cameraSource),
  ]);
  const cameraSampler = device.createSampler({
    label: "camera linear sampler",
    magFilter: "linear",
    minFilter: "linear",
  });

  const computePipeline = device.createComputePipeline({
    label: "ambient particle update",
    layout: "auto",
    compute: { module: computeModule, entryPoint: "main" },
  });
  const drawPipeline = device.createRenderPipeline({
    label: "particle streaks",
    layout: "auto",
    vertex: { module: drawModule, entryPoint: "vs" },
    fragment: {
      module: drawModule,
      entryPoint: "fs",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const cameraPipeline = device.createRenderPipeline({
    label: "camera ghost",
    layout: "auto",
    vertex: { module: cameraModule, entryPoint: "vs" },
    fragment: { module: cameraModule, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const computeGroups = [0, 1].map((sourceIndex) => device.createBindGroup({
    label: `compute ${sourceIndex} to ${1 - sourceIndex}`,
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffers[sourceIndex] } },
      { binding: 2, resource: { buffer: particleBuffers[1 - sourceIndex] } },
    ],
  }));
  const drawGroups = [0, 1].map((index) => device.createBindGroup({
    label: `draw particles ${index}`,
    layout: drawPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffers[index] } },
    ],
  }));

  let sourceIndex = 0;
  return {
    render({ dt, time, width, height, params }) {
      const uniforms = new Float32Array(16);
      uniforms.set([
        dt, time, width / height, params.pointSize,
        params.ambient, params.damping, params.cameraOpacity, particleCount,
        width, height, 0, 0,
      ]);
      device.queue.writeBuffer(uniformBuffer, 0, uniforms);

      const destinationIndex = 1 - sourceIndex;
      const encoder = device.createCommandEncoder({ label: "flowfield frame" });

      const compute = encoder.beginComputePass({ label: "ambient advection" });
      compute.setPipeline(computePipeline);
      compute.setBindGroup(0, computeGroups[sourceIndex]);
      compute.dispatchWorkgroups(Math.ceil(particleCount / WORKGROUP_SIZE));
      compute.end();

      const view = context.getCurrentTexture().createView();
      const render = encoder.beginRenderPass({
        label: "camera and particles",
        colorAttachments: [{
          view,
          clearValue: { r: 0.008, g: 0.014, b: 0.016, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && params.cameraOpacity > 0) {
        const cameraGroup = device.createBindGroup({
          layout: cameraPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: device.importExternalTexture({ source: video }) },
            { binding: 1, resource: cameraSampler },
            { binding: 2, resource: { buffer: uniformBuffer } },
          ],
        });
        render.setPipeline(cameraPipeline);
        render.setBindGroup(0, cameraGroup);
        render.draw(3);
      }

      render.setPipeline(drawPipeline);
      render.setBindGroup(0, drawGroups[destinationIndex]);
      render.draw(6, particleCount);
      render.end();

      device.queue.submit([encoder.finish()]);
      sourceIndex = destinationIndex;
    },
    destroy() {
      uniformBuffer.destroy();
      for (const buffer of particleBuffers) buffer.destroy();
    },
  };
}

async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load shader: ${url}`);
  return response.text();
}

async function checkedShaderModule(device, label, code) {
  const module = device.createShaderModule({ label, code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === "error");
  if (errors.length > 0) {
    const details = errors.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join("\n");
    throw new Error(`${label} shader failed to compile:\n${details}`);
  }
  return module;
}

function seedParticles(device, buffers, count) {
  const data = new ArrayBuffer(count * PARTICLE_STRIDE);
  const floats = new Float32Array(data);
  const uints = new Uint32Array(data);
  for (let i = 0; i < count; i += 1) {
    const base = i * 8;
    floats[base] = Math.random() * 2 - 1;
    floats[base + 1] = Math.random() * 2 - 1;
    floats[base + 2] = 0;
    floats[base + 3] = 0;
    floats[base + 4] = Math.random() * 8;
    floats[base + 5] = 5 + Math.random() * 8;
    uints[base + 6] = (Math.random() * 0xffff_ffff) >>> 0;
    uints[base + 7] = 0;
  }
  for (const buffer of buffers) device.queue.writeBuffer(buffer, 0, data);
}
