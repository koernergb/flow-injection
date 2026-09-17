const PARTICLE_STRIDE = 32;
const PARTICLE_WORKGROUP = 256;
const FLOW_WORKGROUP = 8;
const FLOW_SIZES = [[160, 90], [80, 45], [40, 23], [20, 12]];

export async function createRenderer({ device, context, format, video, particleCount, hasTimestampQuery, onTimings }) {
  const sources = await loadShaders({
    preprocess: "./src/shaders/preprocess.wgsl",
    downsample: "./src/shaders/downsample.wgsl",
    lk: "./src/shaders/lk.wgsl",
    post: "./src/shaders/flow_post.wgsl",
    advect: "./src/shaders/advect.wgsl",
    draw: "./src/shaders/draw.wgsl",
    debug: "./src/shaders/flow_debug.wgsl",
    cameraColor: "./src/shaders/camera_color.wgsl",
    composite: "./src/shaders/composite.wgsl",
  });
  const modules = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([name, code]) => [
    name, await checkedShaderModule(device, name, code),
  ])));

  const uniformBuffer = device.createBuffer({
    label: "frame uniforms",
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const compositeUniformBuffer = device.createBuffer({
    label: "composite uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const particleBuffers = [0, 1].map((index) => device.createBuffer({
    label: `particles ${index}`,
    size: particleCount * PARTICLE_STRIDE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }));
  seedParticles(device, particleBuffers, particleCount);

  const pyramid = [0, 1].map((frameIndex) => FLOW_SIZES.map(([width, height], level) => createTexture(device, {
    label: `gray frame ${frameIndex} level ${level}`,
    width, height, format: "rgba8unorm",
  })));
  const levelFlow = FLOW_SIZES.map(([width, height], level) => [0, 1].map((index) => createTexture(device, {
    label: `LK level ${level} ${index}`,
    width, height, format: "rgba16float",
  })));
  const filteredFlow = [0, 1].map((index) => createTexture(device, {
    label: `filtered flow ${index}`,
    width: FLOW_SIZES[0][0], height: FLOW_SIZES[0][1], format: "rgba16float",
  }));
  const cameraColor = createTexture(device, {
    label: "camera color frame", width: 640, height: 360, format: "rgba8unorm",
  });

  const preprocessPipeline = device.createRenderPipeline({
    label: "camera grayscale",
    layout: "auto",
    vertex: { module: modules.preprocess, entryPoint: "vs" },
    fragment: { module: modules.preprocess, entryPoint: "fs", targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" },
  });
  const cameraColorPipeline = device.createRenderPipeline({
    label: "camera color capture",
    layout: "auto",
    vertex: { module: modules.cameraColor, entryPoint: "vs" },
    fragment: { module: modules.cameraColor, entryPoint: "fs", targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" },
  });
  const downsamplePipeline = device.createComputePipeline({
    label: "grayscale pyramid", layout: "auto", compute: { module: modules.downsample, entryPoint: "main" },
  });
  const lkPipeline = device.createComputePipeline({
    label: "pyramidal Lucas-Kanade", layout: "auto", compute: { module: modules.lk, entryPoint: "main" },
  });
  const postPipeline = device.createComputePipeline({
    label: "flow confidence and EMA", layout: "auto", compute: { module: modules.post, entryPoint: "main" },
  });
  const advectPipeline = device.createComputePipeline({
    label: "flow particle advection", layout: "auto", compute: { module: modules.advect, entryPoint: "main" },
  });
  const drawPipeline = device.createRenderPipeline({
    label: "particle streaks",
    layout: "auto",
    vertex: { module: modules.draw, entryPoint: "vs" },
    fragment: {
      module: modules.draw, entryPoint: "fs",
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
  const debugPipeline = device.createRenderPipeline({
    label: "flow debug",
    layout: "auto",
    vertex: { module: modules.debug, entryPoint: "vs" },
    fragment: {
      module: modules.debug,
      entryPoint: "fs",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const compositePipeline = device.createRenderPipeline({
    label: "camera and effect composite",
    layout: "auto",
    vertex: { module: modules.composite, entryPoint: "vs" },
    fragment: { module: modules.composite, entryPoint: "fs", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const cameraSampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  const downsampleGroups = pyramid.map((levels) => levels.slice(1).map((destination, index) => device.createBindGroup({
    layout: downsamplePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: levels[index].createView() },
      { binding: 1, resource: destination.createView() },
    ],
  })));

  const lkPasses = createLkPasses(device);
  const postGroups = [0, 1].map((sourceIndex) => device.createBindGroup({
    layout: postPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: levelFlow[0][0].createView() },
      { binding: 1, resource: filteredFlow[sourceIndex].createView() },
      { binding: 2, resource: filteredFlow[1 - sourceIndex].createView() },
      { binding: 3, resource: { buffer: uniformBuffer } },
    ],
  }));
  const advectGroups = [0, 1].map((particleSource) => [0, 1].map((flowIndex) => device.createBindGroup({
    layout: advectPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffers[particleSource] } },
      { binding: 2, resource: { buffer: particleBuffers[1 - particleSource] } },
      { binding: 3, resource: filteredFlow[flowIndex].createView() },
    ],
  })));
  const drawGroups = particleBuffers.map((buffer) => device.createBindGroup({
    layout: drawPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }, { binding: 1, resource: { buffer } }],
  }));
  const debugGroups = filteredFlow.map((texture) => device.createBindGroup({
    layout: debugPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: texture.createView() },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
  }));
  const compositeGroup = device.createBindGroup({
    layout: compositePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: cameraColor.createView() },
      { binding: 1, resource: cameraSampler },
      { binding: 2, resource: { buffer: compositeUniformBuffer } },
    ],
  });
  const timing = hasTimestampQuery ? createGpuTiming(device, onTimings) : null;
  if (!timing) onTimings?.(null);

  let particleSource = 0;
  let cameraDestination = 0;
  let flowSource = 0;
  let cameraFrames = 0;

  return {
    render({ dt, time, width, height, params }) {
      timing?.beginFrame();
      const currentCamera = cameraDestination;
      const previousCamera = 1 - currentCamera;
      const nextFlow = 1 - flowSource;
      const effectiveGain = cameraFrames > 0 ? params.flowGain : 0;
      const activeParticleCount = Math.min(particleCount, Math.round(params.particleCount));
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
        dt, time, width / height, params.pointSize,
        params.ambient, params.damping, effectiveGain, activeParticleCount,
        width, height, FLOW_SIZES[0][0], FLOW_SIZES[0][1],
        params.flowSmoothing, params.flowClamp, params.confidenceThreshold, params.styleMode,
        params.dryWet, 0, 0, 0,
      ]));
      device.queue.writeBuffer(compositeUniformBuffer, 0, new Float32Array([params.dryWet, 0, 0, 0]));

      const encoder = device.createCommandEncoder({ label: "flowfield frame" });

      const grayPass = encoder.beginRenderPass({
        label: "camera to grayscale",
        timestampWrites: timing?.writes("camera"),
        colorAttachments: [{
          view: pyramid[currentCamera][0].createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store",
        }],
      });
      let cameraGroup = null;
      let colorCameraGroup = null;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const externalCamera = device.importExternalTexture({ source: video });
        cameraGroup = device.createBindGroup({
          layout: preprocessPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: externalCamera },
            { binding: 1, resource: cameraSampler },
          ],
        });
        colorCameraGroup = device.createBindGroup({
          layout: cameraColorPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: externalCamera },
            { binding: 1, resource: cameraSampler },
          ],
        });
        grayPass.setPipeline(preprocessPipeline);
        grayPass.setBindGroup(0, cameraGroup);
        grayPass.draw(3);
      }
      grayPass.end();

      const colorPass = encoder.beginRenderPass({
        label: "camera color capture",
        timestampWrites: timing?.writes("cameraColor"),
        colorAttachments: [{
          view: cameraColor.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store",
        }],
      });
      if (colorCameraGroup) {
        colorPass.setPipeline(cameraColorPipeline);
        colorPass.setBindGroup(0, colorCameraGroup);
        colorPass.draw(3);
      }
      colorPass.end();

      const pyramidPass = encoder.beginComputePass({ label: "grayscale pyramid", timestampWrites: timing?.writes("pyramid") });
      pyramidPass.setPipeline(downsamplePipeline);
      for (let level = 1; level < FLOW_SIZES.length; level += 1) {
        pyramidPass.setBindGroup(0, downsampleGroups[currentCamera][level - 1]);
        dispatch2d(pyramidPass, ...FLOW_SIZES[level]);
      }
      pyramidPass.end();

      const flowPass = encoder.beginComputePass({ label: "coarse-to-fine LK", timestampWrites: timing?.writes("flow") });
      flowPass.setPipeline(lkPipeline);
      let passIndex = 0;
      for (let level = FLOW_SIZES.length - 1; level >= 0; level -= 1) {
        for (let iteration = 0; iteration < 3; iteration += 1) {
          const prior = iteration === 0
            ? (level === FLOW_SIZES.length - 1 ? levelFlow[level][1] : levelFlow[level + 1][0])
            : levelFlow[level][iteration === 1 ? 0 : 1];
          const outputIndex = iteration === 1 ? 1 : 0;
          const group = device.createBindGroup({
            layout: lkPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: pyramid[currentCamera][level].createView() },
              { binding: 1, resource: pyramid[previousCamera][level].createView() },
              { binding: 2, resource: prior.createView() },
              { binding: 3, resource: levelFlow[level][outputIndex].createView() },
              { binding: 4, resource: { buffer: lkPasses[passIndex] } },
            ],
          });
          flowPass.setBindGroup(0, group);
          dispatch2d(flowPass, ...FLOW_SIZES[level]);
          passIndex += 1;
        }
      }
      flowPass.end();

      const postPass = encoder.beginComputePass({ label: "flow post-process", timestampWrites: timing?.writes("flowPost") });
      postPass.setPipeline(postPipeline);
      postPass.setBindGroup(0, postGroups[flowSource]);
      dispatch2d(postPass, ...FLOW_SIZES[0]);
      postPass.end();

      const destinationParticle = 1 - particleSource;
      const advectPass = encoder.beginComputePass({ label: "particle advection", timestampWrites: timing?.writes("advection") });
      advectPass.setPipeline(advectPipeline);
      advectPass.setBindGroup(0, advectGroups[particleSource][nextFlow]);
      advectPass.dispatchWorkgroups(Math.ceil(activeParticleCount / PARTICLE_WORKGROUP));
      advectPass.end();

      const compositePass = encoder.beginRenderPass({
        label: "dry wet composite",
        timestampWrites: timing?.writes("composite"),
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.003, g: 0.007, b: 0.008, a: 1 }, loadOp: "clear", storeOp: "store",
        }],
      });
      compositePass.setPipeline(compositePipeline);
      compositePass.setBindGroup(0, compositeGroup);
      compositePass.draw(3);
      compositePass.end();

      const renderPass = encoder.beginRenderPass({
        label: "particle render",
        timestampWrites: timing?.writes("draw"),
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          loadOp: "load", storeOp: "store",
        }],
      });
      if (params.showFlow > 0) {
        renderPass.setPipeline(debugPipeline);
        renderPass.setBindGroup(0, debugGroups[nextFlow]);
        renderPass.draw(3);
      }
      renderPass.setPipeline(drawPipeline);
      renderPass.setBindGroup(0, drawGroups[destinationParticle]);
      renderPass.draw(6, activeParticleCount);
      renderPass.end();

      timing?.resolve(encoder);
      device.queue.submit([encoder.finish()]);
      timing?.submitted();
      particleSource = destinationParticle;
      cameraDestination = previousCamera;
      flowSource = nextFlow;
      cameraFrames += 1;
    },
    destroy() {
      uniformBuffer.destroy();
      compositeUniformBuffer.destroy();
      for (const buffer of particleBuffers) buffer.destroy();
      for (const buffer of lkPasses) buffer.destroy();
      for (const levels of pyramid) for (const texture of levels) texture.destroy();
      for (const pair of levelFlow) for (const texture of pair) texture.destroy();
      for (const texture of filteredFlow) texture.destroy();
      cameraColor.destroy();
      timing?.destroy();
    },
  };
}

function createGpuTiming(device, onTimings) {
  const stages = ["camera", "cameraColor", "pyramid", "flow", "flowPost", "advection", "composite", "draw"];
  const queryCount = stages.length * 2;
  const byteSize = queryCount * 8;
  const querySet = device.createQuerySet({ type: "timestamp", count: queryCount });
  const resolveBuffer = device.createBuffer({
    size: byteSize,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  });
  const readbacks = [0, 1].map(() => device.createBuffer({
    size: byteSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  }));
  const busy = [false, false];
  let frameIndex = 0;
  let activeSlot = -1;
  let destroyed = false;

  return {
    beginFrame() {
      const candidate = Math.floor(frameIndex / 120) % readbacks.length;
      activeSlot = frameIndex % 120 === 0 && !busy[candidate] ? candidate : -1;
      frameIndex += 1;
    },
    writes(stage) {
      if (activeSlot < 0) return undefined;
      const index = stages.indexOf(stage) * 2;
      return { querySet, beginningOfPassWriteIndex: index, endOfPassWriteIndex: index + 1 };
    },
    resolve(encoder) {
      if (activeSlot < 0) return;
      encoder.resolveQuerySet(querySet, 0, queryCount, resolveBuffer, 0);
      encoder.copyBufferToBuffer(resolveBuffer, 0, readbacks[activeSlot], 0, byteSize);
    },
    submitted() {
      if (activeSlot < 0) return;
      const slot = activeSlot;
      const buffer = readbacks[slot];
      busy[slot] = true;
      buffer.mapAsync(GPUMapMode.READ).then(() => {
        if (destroyed) return;
        const values = Array.from(new BigUint64Array(buffer.getMappedRange()), Number);
        const ms = Object.fromEntries(stages.map((stage, index) => [stage, (values[index * 2 + 1] - values[index * 2]) / 1e6]));
        const result = {
          preprocess: ms.camera + ms.cameraColor + ms.pyramid,
          flow: ms.flow,
          flowPost: ms.flowPost,
          advection: ms.advection,
          composite: ms.composite,
          draw: ms.draw,
        };
        result.total = Object.values(result).reduce((sum, value) => sum + value, 0);
        onTimings?.(result);
      }).catch(() => {}).finally(() => {
        if (buffer.mapState === "mapped") buffer.unmap();
        busy[slot] = false;
      });
    },
    destroy() {
      destroyed = true;
      querySet.destroy();
      resolveBuffer.destroy();
      for (const buffer of readbacks) buffer.destroy();
    },
  };
}

function createLkPasses(device) {
  const buffers = [];
  for (let level = FLOW_SIZES.length - 1; level >= 0; level -= 1) {
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const data = new ArrayBuffer(32);
      const u32 = new Uint32Array(data);
      const f32 = new Float32Array(data);
      u32[0] = FLOW_SIZES[level][0];
      u32[1] = FLOW_SIZES[level][1];
      f32[2] = iteration === 0 && level < FLOW_SIZES.length - 1 ? 2 : 1;
      u32[3] = iteration === 0 && level === FLOW_SIZES.length - 1 ? 0 : 1;
      f32[4] = 3;
      const buffer = device.createBuffer({
        label: `LK level ${level} iteration ${iteration}`,
        size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(buffer, 0, data);
      buffers.push(buffer);
    }
  }
  return buffers;
}

function createTexture(device, { label, width, height, format }) {
  return device.createTexture({
    label, size: [width, height], format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

function dispatch2d(pass, width, height) {
  pass.dispatchWorkgroups(Math.ceil(width / FLOW_WORKGROUP), Math.ceil(height / FLOW_WORKGROUP));
}

async function loadShaders(entries) {
  return Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([name, url]) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load shader: ${url}`);
    return [name, await response.text()];
  })));
}

async function checkedShaderModule(device, label, code) {
  const module = device.createShaderModule({ label, code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === "error");
  if (errors.length) {
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
    floats[base + 4] = Math.random() * 8;
    floats[base + 5] = 5 + Math.random() * 8;
    uints[base + 6] = (Math.random() * 0xffff_ffff) >>> 0;
  }
  for (const buffer of buffers) device.queue.writeBuffer(buffer, 0, data);
}
