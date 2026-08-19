struct FlowFrame {
  dt: f32, time: f32, aspect: f32, point_size: f32,
  ambient: f32, damping: f32, flow_gain: f32, particle_count: f32,
  resolution: vec2<f32>, flow_resolution: vec2<f32>,
  flow_smoothing: f32, flow_clamp: f32, confidence_threshold: f32, debug_mode: f32,
}
struct Particle {
  position: vec2<f32>, velocity: vec2<f32>, age: f32, lifetime: f32, seed: u32, _pad: u32,
}
@group(0) @binding(0) var<uniform> frame: FlowFrame;
@group(0) @binding(1) var<storage, read> source: array<Particle>;
@group(0) @binding(2) var<storage, read_write> destination: array<Particle>;
@group(0) @binding(3) var flow_texture: texture_2d<f32>;

fn hash(value: u32) -> f32 {
  var x = value;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  return f32((x >> 16u) ^ x) / 4294967295.0;
}
fn ambient_flow(p: vec2<f32>, time: f32) -> vec2<f32> {
  let q = p * vec2<f32>(1.4, 1.8);
  return (vec2<f32>(sin(q.y * 2.0 + time * 0.22), cos(q.x * 1.8 - time * 0.19)) * 0.1
    + vec2<f32>(-p.y, p.x) * 0.12) * frame.ambient;
}
fn bilinear_flow(uv: vec2<f32>) -> vec4<f32> {
  let size = textureDimensions(flow_texture);
  let at = clamp(uv * vec2<f32>(size) - 0.5, vec2<f32>(0.0), vec2<f32>(size) - 1.001);
  let base = vec2<i32>(floor(at));
  let f = fract(at);
  let limit = vec2<i32>(size) - 1;
  let a = textureLoad(flow_texture, base, 0);
  let b = textureLoad(flow_texture, min(base + vec2<i32>(1, 0), limit), 0);
  let c = textureLoad(flow_texture, min(base + vec2<i32>(0, 1), limit), 0);
  let d = textureLoad(flow_texture, min(base + vec2<i32>(1, 1), limit), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= u32(frame.particle_count)) { return; }
  var particle = source[index];
  let uv = particle.position * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
  let sampled = bilinear_flow(uv);
  let camera_velocity = vec2<f32>(
    sampled.x * 2.0 / frame.flow_resolution.x,
    sampled.y * -2.0 / frame.flow_resolution.y,
  ) * frame.flow_gain * sampled.z;
  let desired_velocity = camera_velocity + ambient_flow(particle.position, frame.time);
  particle.velocity = particle.velocity * frame.damping + desired_velocity * frame.dt * 4.0;
  particle.position += particle.velocity * frame.dt;
  particle.age += frame.dt;
  let outside = any(abs(particle.position) > vec2<f32>(1.08));
  if (particle.age > particle.lifetime || outside) {
    particle.seed += 0x9e3779b9u;
    particle.position = vec2<f32>(hash(particle.seed) * 2.0 - 1.0, hash(particle.seed ^ 0xa511e9b3u) * 2.0 - 1.0);
    particle.velocity = vec2<f32>(0.0);
    particle.age = 0.0;
    particle.lifetime = 5.0 + hash(particle.seed ^ 0x63d83595u) * 8.0;
  }
  destination[index] = particle;
}
