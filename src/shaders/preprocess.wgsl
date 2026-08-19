struct FlowFrame {
  dt: f32,
  time: f32,
  aspect: f32,
  point_size: f32,
  ambient: f32,
  damping: f32,
  flow_gain: f32,
  particle_count: f32,
  resolution: vec2<f32>,
  flow_resolution: vec2<f32>,
  flow_smoothing: f32,
  flow_clamp: f32,
  confidence_threshold: f32,
  debug_mode: f32,
}

@group(0) @binding(0) var camera: texture_external;
@group(0) @binding(1) var camera_sampler: sampler;
@group(0) @binding(2) var<uniform> frame: FlowFrame;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOutput {
  let positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0),
  );
  let p = positions[index];
  var output: VertexOutput;
  output.position = vec4<f32>(p, 0.0, 1.0);
  output.uv = vec2<f32>(1.0 - (p.x * 0.5 + 0.5), p.y * -0.5 + 0.5);
  return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let rgb = textureSampleBaseClampToEdge(camera, camera_sampler, input.uv).rgb;
  let gray = dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
  return vec4<f32>(gray, gray, gray, 1.0);
}
