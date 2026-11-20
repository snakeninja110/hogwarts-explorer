import {
  Scene,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  HDRCubeTexture,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  Mesh,
} from '@babylonjs/core';

type Lighting = 'walk' | 'studio' | 'lake-day' | 'lake-night';

export class EnvironmentRenderer {
  private scene: Scene;
  private ambientLight: HemisphericLight | null = null;
  private moonLight: DirectionalLight | null = null;
  private shadowGenerator: ShadowGenerator | null = null;
  private skyDome: Mesh | null = null;
  private studioEnvironment: HDRCubeTexture | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  setupNightEnvironment(): { shadowGenerator: ShadowGenerator } {
    // 1. Scene Fog - mysterious Scottish Highlands night fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.007;
    this.scene.fogColor = new Color3(0.02, 0.03, 0.08);

    // 2. Ambient Moonlight (Hemispheric Light)
    this.ambientLight = new HemisphericLight(
      'ambientMoonlight',
      new Vector3(0, 1, 0),
      this.scene,
    );

    // 3. Directional Moonlight (Key light) casting long dramatic shadows
    this.moonLight = new DirectionalLight(
      'moonDirectionalLight',
      new Vector3(-0.6, -0.8, 0.4).normalize(),
      this.scene,
    );
    this.moonLight.position = new Vector3(60, 100, -40);
    this.moonLight.specular = new Color3(0.2, 0.25, 0.35);

    // 4. Soft Shadow Generator
    this.shadowGenerator = new ShadowGenerator(2048, this.moonLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 18;
    this.shadowGenerator.bias = 0.001;
    this.shadowGenerator.normalBias = 0.08;

    // 5. Starry Night Sky Dome
    this.createSkyDome();
    this.studioEnvironment = new HDRCubeTexture(
      `${import.meta.env.BASE_URL}textures/castle/studio-small-03.hdr`,
      this.scene, 128, false, true, false, true,
    );
    this.scene.environmentTexture = this.studioEnvironment;
    this.setLighting('walk');

    return { shadowGenerator: this.shadowGenerator };
  }

  private createSkyDome(): void {
    this.skyDome = MeshBuilder.CreateSphere(
      'skyDome',
      { diameter: 1400, segments: 16 },
      this.scene,
    );
    this.skyDome.infiniteDistance = true;
    this.skyDome.isPickable = false;

    const skyMat = new StandardMaterial('skyMat', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.disableDepthWrite = true;
    skyMat.fogEnabled = false;
    skyMat.emissiveColor = new Color3(0.015, 0.02, 0.06); // Deep midnight indigo

    this.skyDome.material = skyMat;
    this.skyDome.checkCollisions = false;
  }

  getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  setLighting(mode: Lighting): void {
    const studio = mode === 'studio';
    const lakeDay = mode === 'lake-day';
    const daylight = studio || lakeDay;
    this.scene.fogEnabled = !studio;
    this.scene.fogDensity = lakeDay ? 0.0017 : mode === 'lake-night' ? 0.0021 : 0.007;
    this.scene.fogColor.set(lakeDay ? 0.47 : 0.02, lakeDay ? 0.57 : 0.03, lakeDay ? 0.65 : 0.08);
    this.scene.environmentIntensity = daylight ? 0.72 : 0.18;
    this.scene.clearColor = studio ? new Color4(0.08, 0.10, 0.14, 1)
      : lakeDay ? new Color4(0.47, 0.57, 0.65, 1) : new Color4(0.01, 0.015, 0.04, 1);
    this.skyDome?.setEnabled(!studio);
    const sky = this.skyDome?.material as StandardMaterial | null;
    sky?.emissiveColor.set(lakeDay ? 0.47 : 0.015, lakeDay ? 0.57 : 0.02, lakeDay ? 0.65 : 0.06);
    if (this.ambientLight) {
      this.ambientLight.intensity = daylight ? 1.12 : 0.75;
      this.ambientLight.diffuse = daylight ? new Color3(0.76, 0.85, 1) : new Color3(0.55, 0.63, 0.82);
      this.ambientLight.groundColor = daylight ? new Color3(0.41, 0.44, 0.53) : new Color3(0.10, 0.12, 0.17);
      this.ambientLight.specular = daylight ? Color3.Black() : Color3.White();
    }
    if (this.moonLight) {
      this.moonLight.position.set(daylight ? -60 : 60, 100, -58);
      this.moonLight.direction.set(daylight ? 0.48 : -0.6, -0.76, 0.48).normalize();
      this.moonLight.intensity = daylight ? 2.3 : 1.35;
      this.moonLight.diffuse = daylight ? new Color3(1.0, 0.88, 0.73) : new Color3(0.7, 0.8, 0.95);
    }
  }

  dispose(): void {
    this.scene.environmentTexture = null;
    this.studioEnvironment?.dispose();
    this.skyDome?.dispose();
    this.shadowGenerator?.dispose();
    this.moonLight?.dispose();
    this.ambientLight?.dispose();
    this.skyDome = null;
    this.shadowGenerator = null;
    this.moonLight = null;
    this.ambientLight = null;
    this.studioEnvironment = null;
  }
}
