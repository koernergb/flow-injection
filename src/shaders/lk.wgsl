struct LkPass {
  size: vec2<u32>,
  prior_scale: f32,
  use_prior: u32,
  max_delta: f32,
  _pad0: f32,
  _pad1: vec2<f32>,
}

@group(0) @binding(0) var current_image: texture_2d<f32>;
@group(0) @binding(1) var previous_image: texture_2d<f32>;
@group(0) @binding(2) var prior_flow: texture_2d<f32>;
@group(0) @binding(3) var output_flow: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var<uniform> config: LkPass;

fn gray(texture: texture_2d<f32>, p: vec2<i32>) -> f32 {
  let limit = vec2<i32>(textureDimensions(texture)) - vec2<i32>(1);
  return textureLoad(texture, clamp(p, vec2<i32>(0), limit), 0).r;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (any(id.xy >= config.size)) { return; }
  let p = vec2<i32>(id.xy);
  var prior = vec2<f32>(0.0);
  if (config.use_prior != 0u) {
    let prior_size = textureDimensions(prior_flow);
    let prior_coord = min(vec2<u32>(vec2<f32>(id.xy) / config.prior_scale), prior_size - vec2<u32>(1u));
    prior = textureLoad(prior_flow, vec2<i32>(prior_coord), 0).xy * config.prior_scale;
  }
  let warped = p + vec2<i32>(round(prior));

  var a11 = 0.0;
  var a12 = 0.0;
  var a22 = 0.0;
  var b1 = 0.0;
  var b2 = 0.0;
  for (var oy = -3; oy <= 3; oy += 1) {
    for (var ox = -3; ox <= 3; ox += 1) {
      let offset = vec2<i32>(ox, oy);
      let cp = p + offset;
      let pp = warped + offset;
      let ix = (gray(current_image, cp + vec2<i32>(1, 0)) - gray(current_image, cp - vec2<i32>(1, 0))
        + gray(previous_image, pp + vec2<i32>(1, 0)) - gray(previous_image, pp - vec2<i32>(1, 0))) * 0.25;
      let iy = (gray(current_image, cp + vec2<i32>(0, 1)) - gray(current_image, cp - vec2<i32>(0, 1))
        + gray(previous_image, pp + vec2<i32>(0, 1)) - gray(previous_image, pp - vec2<i32>(0, 1))) * 0.25;
      let it = gray(current_image, cp) - gray(previous_image, pp);
      a11 += ix * ix;
      a12 += ix * iy;
      a22 += iy * iy;
      b1 += ix * it;
      b2 += iy * it;
    }
  }

  let det = a11 * a22 - a12 * a12;
  var delta = vec2<f32>(0.0);
  if (det > 0.000001) {
    delta = -vec2<f32>(a22 * b1 - a12 * b2, a11 * b2 - a12 * b1) / det;
    let magnitude = length(delta);
    if (magnitude > config.max_delta) { delta *= config.max_delta / magnitude; }
  }
  let confidence = clamp(det * 40.0, 0.0, 1.0);
  textureStore(output_flow, p, vec4<f32>(prior + delta, confidence, 1.0));
}
