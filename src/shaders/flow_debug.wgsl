struct FlowFrame {
  dt: f32, time: f32, aspect: f32, point_size: f32,
  ambient: f32, damping: f32, flow_gain: f32, particle_count: f32,
  resolution: vec2<f32>, flow_resolution: vec2<f32>,
  flow_smoothing: f32, flow_clamp: f32, confidence_threshold: f32, debug_mode: f32,
}
@group(0) @binding(0) var flow: texture_2d<f32>;
@group(0) @binding(1) var<uniform> frame: FlowFrame;

struct Out { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> }
@vertex fn vs(@builtin(vertex_index) i: u32) -> Out {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0,-1.0), vec2<f32>(3.0,-1.0), vec2<f32>(-1.0,3.0))[i];
  var out: Out;
  out.position = vec4<f32>(p, 0.0, 1.0);
  out.uv = p * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
  return out;
}
@fragment fn fs(input: Out) -> @location(0) vec4<f32> {
  let size = textureDimensions(flow);
  let p = vec2<i32>(clamp(input.uv * vec2<f32>(size), vec2<f32>(0.0), vec2<f32>(size - vec2<u32>(1u))));
  let value = textureLoad(flow, p, 0);
  let angle = atan2(value.y, value.x) / 6.2831853 + 0.5;
  let color = 0.5 + 0.5 * cos(6.2831853 * (angle + vec3<f32>(0.0, 0.67, 0.33)));
  return vec4<f32>(color * value.z * min(length(value.xy) * 0.25, 1.0), 1.0);
}
