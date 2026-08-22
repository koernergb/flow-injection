struct BlurParams {
  enabled: f32,
  strength: f32,
  sample_tier: f32,
  edge_rejection: f32,
  color_resolution: vec2<f32>,
  flow_resolution: vec2<f32>,
}

@group(0) @binding(0) var color_frame: texture_2d<f32>;
@group(0) @binding(1) var flow_frame: texture_2d<f32>;
@group(0) @binding(2) var linear_sampler: sampler;
@group(0) @binding(3) var<uniform> params: BlurParams;

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

fn tap_count(tier: f32) -> i32 {
  if (tier < 0.5) { return 5; }
  if (tier < 1.5) { return 9; }
  return 13;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4<f32> {
  if (params.enabled < 0.5) {
    return vec4<f32>(0.003, 0.007, 0.008, 1.0);
  }

  let uv = clamp(input.uv, vec2<f32>(0.0), vec2<f32>(1.0));
  let center = textureSampleLevel(color_frame, linear_sampler, uv, 0.0).rgb;
  let flow = textureSampleLevel(flow_frame, linear_sampler, uv, 0.0);
  let confidence = clamp(flow.z, 0.0, 1.0);
  let span = flow.xy / params.flow_resolution * params.strength * confidence;
  let count = tap_count(params.sample_tier);

  var color_sum = vec3<f32>(0.0);
  var weight_sum = 0.0;
  for (var tap = 0; tap < 13; tap += 1) {
    if (tap >= count) { break; }
    let along = f32(tap) / f32(count - 1) - 0.5;
    let sample_uv = clamp(uv + span * along, vec2<f32>(0.0), vec2<f32>(1.0));
    let sample_color = textureSampleLevel(color_frame, linear_sampler, sample_uv, 0.0).rgb;
    let difference = dot(abs(sample_color - center), vec3<f32>(0.333333));
    let edge_weight = exp(-difference * params.edge_rejection);
    color_sum += sample_color * edge_weight;
    weight_sum += edge_weight;
  }

  let blurred = color_sum / max(weight_sum, 0.0001);
  return vec4<f32>(blurred, 1.0);
}
