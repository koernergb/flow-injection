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

@group(0) @binding(0) var camera: texture_external;
@group(0) @binding(1) var<uniform> frame: Frame;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOutput {
  let positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0),
  );
  let position = positions[index];
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = vec2<f32>(1.0 - position.x * 0.5 - 0.5, position.y * -0.5 + 0.5);
  return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let sample = textureSampleBaseClampToEdge(camera, input.uv);
  let luminance = dot(sample.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
  let tint = vec3<f32>(0.18, 0.34, 0.31) * luminance;
  return vec4<f32>(tint * frame.camera_opacity, 1.0);
}
