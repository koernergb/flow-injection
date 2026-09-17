@group(0) @binding(0) var camera: texture_external;
@group(0) @binding(1) var camera_sampler: sampler;

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
  return vec4<f32>(textureSampleBaseClampToEdge(camera, camera_sampler, input.uv).rgb, 1.0);
}
