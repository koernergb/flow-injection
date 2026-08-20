struct Frame {
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
  @location(2) direction: f32,
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
  let style = u32(round(frame.style_mode));
  let streak_scale = select(select(90.0, 125.0, style == 1u), 52.0, style == 2u);
  let streak_limit = select(select(5.0, 8.0, style == 1u), 3.0, style == 2u);
  let streak = frame.point_size * (1.0 + min(speed * streak_scale, streak_limit));
  let offset = direction * corner.x * streak * pixels + normal * corner.y * frame.point_size * pixels;

  var output: VertexOutput;
  output.position = vec4<f32>(particle.position + offset, 0.0, 1.0);
  output.local = corner;
  output.speed = speed;
  output.direction = atan2(particle.velocity.y, particle.velocity.x);
  return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let shape = max(0.0, 1.0 - dot(input.local, input.local));
  let style = u32(round(frame.style_mode));
  var intensity = shape * (0.1 + min(input.speed * 11.0, 0.58));
  var color = mix(vec3<f32>(0.22, 0.72, 0.64), vec3<f32>(0.82, 1.0, 0.94), min(input.speed * 12.0, 1.0));
  if (style == 1u) {
    let hue = input.direction / 6.2831853 + 0.5;
    color = 0.58 + 0.42 * cos(6.2831853 * (hue + vec3<f32>(0.0, 0.67, 0.33)));
    intensity = shape * (0.15 + min(input.speed * 15.0, 0.82));
  } else if (style == 2u) {
    color = vec3<f32>(0.9, 0.96, 1.0);
    intensity = shape * smoothstep(0.001, 0.018, input.speed) * (0.08 + min(input.speed * 14.0, 0.7));
  }
  return vec4<f32>(color, intensity);
}
