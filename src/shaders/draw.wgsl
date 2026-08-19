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
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) local: vec2<f32>,
  @location(1) speed: f32,
}

@vertex
fn vs(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VertexOutput {
  let corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0),
  );
  let particle = particles[instance];
  let speed = length(particle.velocity);
  let direction = select(vec2<f32>(1.0, 0.0), normalize(particle.velocity), speed > 0.0001);
  let normal = vec2<f32>(-direction.y, direction.x);
  let corner = corners[vertex];
  let pixels = vec2<f32>(2.0 / frame.resolution.x, 2.0 / frame.resolution.y);
  let streak = frame.point_size * (1.0 + min(speed * 90.0, 5.0));
  let offset = direction * corner.x * streak * pixels + normal * corner.y * frame.point_size * pixels;

  var output: VertexOutput;
  output.position = vec4<f32>(particle.position + offset, 0.0, 1.0);
  output.local = corner;
  output.speed = speed;
  return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let shape = max(0.0, 1.0 - dot(input.local, input.local));
  let intensity = shape * (0.12 + min(input.speed * 10.0, 0.55));
  let color = mix(vec3<f32>(0.25, 0.78, 0.68), vec3<f32>(0.78, 1.0, 0.91), min(input.speed * 12.0, 1.0));
  return vec4<f32>(color * intensity, intensity);
}
