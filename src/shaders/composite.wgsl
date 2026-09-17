struct CompositeParams {
  dry_wet: f32,
  _padding_0: f32,
  _padding_1: f32,
  _padding_2: f32,
}

@group(0) @binding(0) var camera_frame: texture_2d<f32>;
@group(0) @binding(1) var linear_sampler: sampler;
@group(0) @binding(2) var<uniform> params: CompositeParams;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOutput {
  let p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0),
  )[index];
  var output: VertexOutput;
  output.position = vec4<f32>(p, 0.0, 1.0);
  output.uv = p * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
  return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = clamp(input.uv, vec2<f32>(0.0), vec2<f32>(1.0));
  let camera = textureSampleLevel(camera_frame, linear_sampler, uv, 0.0).rgb;
  let effect_background = vec3<f32>(0.003, 0.007, 0.008);
  return vec4<f32>(mix(camera, effect_background, clamp(params.dry_wet, 0.0, 1.0)), 1.0);
}
