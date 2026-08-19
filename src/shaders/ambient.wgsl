struct Frame {
  dt: f32,
  time: f32,
  aspect: f32,
  point_size: f32,
  ambient: f32,
  damping: f32,
  camera_opacity: f32,
  particle_count: f32,
  resolution: vec2<f32>,
  _pad: vec2<f32>,
}

struct Particle {
  position: vec2<f32>,
  velocity: vec2<f32>,
  age: f32,
  lifetime: f32,
  seed: u32,
  _pad: u32,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> source: array<Particle>;
@group(0) @binding(2) var<storage, read_write> destination: array<Particle>;

fn hash(value: u32) -> f32 {
  var x = value;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return f32(x) / 4294967295.0;
}

fn flow(p: vec2<f32>, time: f32) -> vec2<f32> {
  let q = p * vec2<f32>(1.8, 2.2);
  let a = sin(q.y * 2.1 + time * 0.31) + cos(q.y * 4.3 - time * 0.17) * 0.35;
  let b = cos(q.x * 2.0 - time * 0.27) - sin(q.x * 3.7 + time * 0.23) * 0.35;
  let orbit = vec2<f32>(-p.y, p.x) * (0.18 + 0.08 * sin(time * 0.2));
  return (vec2<f32>(a, b) * 0.12 + orbit) * frame.ambient;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= u32(frame.particle_count)) { return; }

  var particle = source[index];
  let acceleration = flow(particle.position, frame.time);
  particle.velocity = particle.velocity * frame.damping + acceleration * frame.dt;
  particle.position += particle.velocity * frame.dt;
  particle.age += frame.dt;

  let outside = any(abs(particle.position) > vec2<f32>(1.08));
  if (particle.age > particle.lifetime || outside) {
    particle.seed = particle.seed + 0x9e3779b9u;
    particle.position = vec2<f32>(
      hash(particle.seed) * 2.0 - 1.0,
      hash(particle.seed ^ 0xa511e9b3u) * 2.0 - 1.0,
    );
    particle.velocity = vec2<f32>(0.0);
    particle.age = 0.0;
    particle.lifetime = 5.0 + hash(particle.seed ^ 0x63d83595u) * 8.0;
  }

  destination[index] = particle;
}
