import { AbstractMesh, Color4, Mesh, MirrorTexture, Plane, Scene, ShaderMaterial, VertexData } from '@babylonjs/core';

const waterLevel = 0.2;

const vertexSource = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec3 vPosition;
varying vec2 vShore;
varying vec4 vScreen;

void main() {
  vPosition = position;
  vShore = uv;
  vScreen = worldViewProjection * vec4(position, 1.0);
  gl_Position = vScreen;
}`;

const fragmentSource = `
precision highp float;
uniform sampler2D mirror;
uniform vec3 eye;
uniform float time;
uniform float daylight;
varying vec3 vPosition;
varying vec2 vShore;
varying vec4 vScreen;

void main() {
  vec2 p = vPosition.xz;
  vec3 toEye = eye - vPosition;
  vec3 view = normalize(toEye);
  float waveA = sin(dot(p, vec2(0.52, 1.38)) - time * 1.20);
  float waveB = sin(dot(p, vec2(-0.93, 1.96)) + time * 1.43);
  float waveC = sin(dot(p, vec2(1.56, 3.31)) - time * 2.05);
  float fine = sin(dot(p, vec2(0.88, 7.0)) - time * 2.68);
  float detail = 1.0 - smoothstep(45.0, 160.0, length(toEye));
  vec2 ripple = vec2(waveA * 0.57 + waveC * 0.21, waveB * 0.53 + waveA * 0.29 + fine * 0.18 * detail);
  vec3 normal = normalize(vec3(ripple.x * 0.068, 1.0, ripple.y * 0.072));
  float grazing = 1.0 - clamp(dot(normal, view), 0.0, 1.0);
  vec2 uv = vScreen.xy / vScreen.w * 0.5 + 0.5;
  vec2 offset = ripple * vec2(0.0026, 0.0065) * mix(0.40, 1.0, detail);
  vec4 image = texture2D(mirror, clamp(uv + offset, 0.001, 0.999));

  vec3 sky = mix(vec3(0.047, 0.065, 0.103), vec3(0.47, 0.57, 0.65), daylight);
  vec3 reflection = mix(sky, image.rgb, image.a);
  float shore = smoothstep(0.79, 1.0, length(vShore));
  vec3 deep = mix(vec3(0.017, 0.032, 0.054), vec3(0.108, 0.205, 0.238), daylight);
  vec3 shallow = mix(vec3(0.050, 0.072, 0.076), vec3(0.235, 0.302, 0.248), daylight);
  vec3 water = mix(deep, shallow, shore);
  float reflectance = (0.28 + 0.60 * pow(grazing, 2.2)) * (1.0 - 0.52 * shore);
  vec3 color = mix(water, reflection, reflectance);
  float sheen = waveA * 0.002 + waveB * 0.0015 + fine * detail * 0.003;
  color += sheen * mix(0.58, 1.0, daylight) * vec3(0.65, 0.88, 1.0);
  gl_FragColor = vec4(color, 1.0);
}`;

export class BlackLake {
  private readonly surface: Mesh;
  private readonly material: ShaderMaterial;
  private readonly reflection: MirrorTexture;

  constructor(private readonly scene: Scene, reflectedMeshes: AbstractMesh[]) {
    this.surface = new Mesh('Black Lake', scene);
    const positions = [-31, waterLevel, -25];
    const uvs = [0, 0];
    const indices: number[] = [];
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const inlet = 1 + 0.054 * Math.sin(3 * angle + 0.45) + 0.039 * Math.sin(5 * angle) + 0.016 * Math.cos(11 * angle);
      positions.push(-31 + 109 * x * inlet, waterLevel, -25 + 103 * z * inlet);
      uvs.push(x, z);
      indices.push(0, i + 1, (i + 1) % segments + 1);
    }
    const data = new VertexData();
    Object.assign(data, { positions, uvs, indices });
    data.applyToMesh(this.surface);
    this.surface.isPickable = false;

    this.reflection = new MirrorTexture('Black Lake reflection', { ratio: 0.5 }, scene, false);
    this.reflection.mirrorPlane = new Plane(0, -1, 0, waterLevel);
    this.reflection.clearColor = new Color4(0, 0, 0, 0);
    this.reflection.renderList = reflectedMeshes.filter(mesh => mesh.getTotalVertices() > 0);
    this.material = new ShaderMaterial('Black Lake water', scene, { vertexSource, fragmentSource }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'eye', 'time', 'daylight'],
      samplers: ['mirror'],
    });
    this.material.setTexture('mirror', this.reflection);
    this.material.setFloat('daylight', 0);
    this.material.onBindObservable.add(() => {
      const eye = scene.activeCamera?.globalPosition;
      const effect = this.material.getEffect();
      if (eye) effect?.setVector3('eye', eye);
      effect?.setFloat('time', performance.now() * 0.001);
    });
    this.surface.material = this.material;
    this.setVisible(true);
  }

  setVisible(visible: boolean): void {
    this.surface.setEnabled(visible);
    const targets = this.scene.customRenderTargets;
    const index = targets.indexOf(this.reflection);
    if (visible && index < 0) targets.push(this.reflection);
    if (!visible && index >= 0) targets.splice(index, 1);
  }

  setDaylight(daylight: boolean): void {
    this.material.setFloat('daylight', daylight ? 1 : 0);
  }

  dispose(): void {
    this.setVisible(false);
    this.surface.dispose();
    this.material.dispose();
    this.reflection.dispose();
  }
}
