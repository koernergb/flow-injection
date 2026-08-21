@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var destination: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let out_size = textureDimensions(destination);
  if (any(id.xy >= out_size)) { return; }
  let in_size = textureDimensions(source);
  let base = vec2<i32>(min(id.xy * 2u, in_size - vec2<u32>(1u)));
  let limit = vec2<i32>(in_size) - vec2<i32>(1);
  let a = textureLoad(source, base, 0);
  let b = textureLoad(source, min(base + vec2<i32>(1, 0), limit), 0);
  let c = textureLoad(source, min(base + vec2<i32>(0, 1), limit), 0);
  let d = textureLoad(source, min(base + vec2<i32>(1, 1), limit), 0);
  textureStore(destination, vec2<i32>(id.xy), (a + b + c + d) * 0.25);
}
