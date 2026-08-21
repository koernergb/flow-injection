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
  style_mode: f32,
}

@group(0) @binding(0) var raw_flow: texture_2d<f32>;
@group(0) @binding(1) var previous_flow: texture_2d<f32>;
@group(0) @binding(2) var filtered_flow: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<uniform> frame: FlowFrame;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let size = textureDimensions(filtered_flow);
  if (any(id.xy >= size)) { return; }
  let p = vec2<i32>(id.xy);
  let raw = textureLoad(raw_flow, p, 0);
  let old = textureLoad(previous_flow, p, 0);
  var velocity = mix(raw.xy, old.xy, frame.flow_smoothing);
  let magnitude = length(velocity);
  if (magnitude > frame.flow_clamp) { velocity *= frame.flow_clamp / magnitude; }
  let confidence = smoothstep(frame.confidence_threshold, frame.confidence_threshold * 2.0 + 0.0001, raw.z);
  textureStore(filtered_flow, p, vec4<f32>(velocity, confidence, magnitude));
}
