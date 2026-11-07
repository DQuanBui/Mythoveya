import * as T from "three";
import { cloudField } from "./cloud-pass";
// Cloud shadows drift over everything lit, ground, houses and creatures alike,
// by dimming direct light at each point's world position. Hooking every
// material at once is what keeps separate ground meshes from showing seams.
const SIZE = 64;
const map = new T.DataTexture(cloudField(SIZE), SIZE, SIZE, T.RedFormat);
map.wrapS = map.wrapT = T.RepeatWrapping;
map.magFilter = map.minFilter = T.LinearFilter;
map.needsUpdate = true;
/** x, y: drift in metres; z: strength, 0 where there is no sun to dim. */
export const cloudShadow = { value: new T.Vector3(0, 0, 0) };
const cloudMap = { value: map };
type Shader = Parameters<T.Material["onBeforeCompile"]>[0];
/** Adds cloud shadows to a lit material's shader; others are left alone. Call
 * it from any material with an onBeforeCompile of its own. */
export function withCloudShadows(shader: Shader) {
  if (!shader.fragmentShader.includes("#include <lights_fragment_end>")) return;
  shader.uniforms.uCloudShadow = cloudShadow;
  shader.uniforms.uCloudMap = cloudMap;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vCloudAt;")
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vec4 cloudAt = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cloudAt = instanceMatrix * cloudAt;
      #endif
      vCloudAt = (modelMatrix * cloudAt).xz;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec2 vCloudAt;\nuniform vec3 uCloudShadow;\nuniform sampler2D uCloudMap;",
    )
    .replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
      if (uCloudShadow.z > 0.001) {
        vec2 cloudUv = vCloudAt + uCloudShadow.xy;
        float cloud = texture2D(uCloudMap, cloudUv * 0.011).r * 0.7 + texture2D(uCloudMap, cloudUv * 0.027 + 0.37).r * 0.3;
        float cloudDim = 1.0 - uCloudShadow.z * smoothstep(0.5, 0.62, cloud);
        reflectedLight.directDiffuse *= cloudDim;
        reflectedLight.directSpecular *= cloudDim;
        reflectedLight.indirectDiffuse *= 1.0 - (1.0 - cloudDim) * 0.3;
      }`,
    );
}
T.Material.prototype.onBeforeCompile = withCloudShadows;
