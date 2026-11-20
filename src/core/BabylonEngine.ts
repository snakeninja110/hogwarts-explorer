import {
  ArcRotateCamera,
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import { EnvironmentRenderer } from '../rendering/EnvironmentRenderer';
import { ZoneManager } from '../world/zones/ZoneManager';
import { CastleGroundsZone } from '../world/zones/CastleGroundsZone';

export type ViewMode = 'walk' | 'castle' | 'lake-day' | 'lake-night';

export interface BabylonEngineCallbacks {
  onZoneChange: (zone: string) => void;
  onInteractionHint: (hint: string | null) => void;
  onViewChange: (view: ViewMode) => void;
}

export class BabylonEngine {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: UniversalCamera | null = null;
  private overviewCamera: ArcRotateCamera | null = null;
  private view: ViewMode = 'walk';
  private canvas: HTMLCanvasElement;
  private callbacks: BabylonEngineCallbacks;

  private environmentRenderer: EnvironmentRenderer | null = null;
  private zoneManager: ZoneManager | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: BabylonEngineCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    // 1. Create Babylon Engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    // 2. Create Scene with Scottish Highlands midnight atmosphere
    this.scene = new Scene(this.engine);
    this.scene.collisionsEnabled = true;
    this.scene.gravity = new Vector3(0, -0.07, 0);

    // 3. Setup First-person Player Camera
    this.setupCamera();

    // 4. Setup Lighting, Fog, Shadows & Starry Dome
    this.environmentRenderer = new EnvironmentRenderer(this.scene);
    const { shadowGenerator } = this.environmentRenderer.setupNightEnvironment();

    // 5. Initialize Zone Manager and load Castle Grounds
    if (this.camera) {
      this.zoneManager = new ZoneManager(this.scene, this.camera, {
        onZoneChange: this.callbacks.onZoneChange,
        onInteractionHint: this.callbacks.onInteractionHint,
      });

      await this.zoneManager.loadZone('exterior', shadowGenerator);
    }

    if (!this.engine) return;

    // 6. Setup Event Listeners (Keyboard interaction and pointer lock)
    this.setupEventListeners();

    // 7. Start Render Loop
    this.engine.runRenderLoop(() => {
      if (this.engine && this.scene && this.camera && this.zoneManager) {
        // Babylon applies gravity as a per-frame displacement. Scale it with frame time
        // so the downward pull does not prevent walking up the stair ramps at high FPS.
        this.scene.gravity.y = -0.0042 * Math.min(this.engine.getDeltaTime(), 50);
        this.zoneManager.update(this.camera.position);
        this.scene.render();
      }
    });

    await this.scene.whenReadyAsync();
  }

  private setupCamera(): void {
    if (!this.scene) return;

    // Initial camera placeholder; precise position set by active Zone spawn point
    this.camera = new UniversalCamera(
      'playerCamera',
      new Vector3(-8, 16.5, -42),
      this.scene,
    );
    this.camera.setTarget(new Vector3(-8, 17, 2));

    // WASD controls
    this.camera.keysUp = [87]; // W
    this.camera.keysDown = [83]; // S
    this.camera.keysLeft = [65]; // A
    this.camera.keysRight = [68]; // D
    this.camera.speed = 0.45;
    this.camera.angularSensibility = 2200;
    this.camera.inertia = 0.65;

    // Collisions & player gravity
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    // Babylon centers the body one ellipsoid radius below the camera.
    this.camera.ellipsoid = new Vector3(0.5, 0.9, 0.5);

    this.camera.attachControl(this.canvas, true);

    this.overviewCamera = new ArcRotateCamera('castleOverview', 0, 1, 1, Vector3.Zero(), this.scene);
    this.overviewCamera.wheelDeltaPercentage = 0.04;
    this.overviewCamera.pinchDeltaPercentage = 0.01;
  }

  async toggleOverview(): Promise<void> {
    if (this.view !== 'walk') {
      this.returnToWalk();
      return;
    }
    await this.showOverview('castle');
  }

  async toggleLakeView(): Promise<void> {
    const lake = this.view === 'lake-day' || this.view === 'lake-night';
    await this.showOverview(lake ? 'castle' : 'lake-day');
  }

  toggleLakeLight(): void {
    const grounds = this.zoneManager?.getCurrentZone();
    if (!(grounds instanceof CastleGroundsZone)) return;
    if (this.view === 'lake-day') this.setView('lake-night', grounds);
    else if (this.view === 'lake-night') this.setView('lake-day', grounds);
  }

  private setView(view: ViewMode, grounds: CastleGroundsZone | null): void {
    grounds?.setTerrainVisible(view !== 'castle');
    grounds?.setHallDoorsClosed(view !== 'walk');
    grounds?.setLakeLighting(view === 'lake-day' ? 'day' : view === 'lake-night' ? 'night' : null);
    this.environmentRenderer?.setLighting(view === 'castle' ? 'studio' : view);
    this.view = view;
    this.callbacks.onViewChange(view);
  }

  private async showOverview(view: 'castle' | 'lake-day'): Promise<void> {
    const { engine, scene, overviewCamera, zoneManager } = this;
    if (!engine || !scene || !overviewCamera || !zoneManager) return;

    const currentZone = zoneManager.getCurrentZone();
    if (!currentZone) return;
    if (!(currentZone instanceof CastleGroundsZone)) await zoneManager.switchZone('exterior');

    const grounds = zoneManager.getCurrentZone();
    if (scene.isDisposed || !(grounds instanceof CastleGroundsZone)) return;
    const bounds = grounds.getCastleBounds();
    if (!bounds) return;

    const lake = view === 'lake-day';
    const focus = bounds.center.clone();
    if (lake) focus.y -= (bounds.max.y - bounds.min.y) * 0.27;
    overviewCamera.setTarget(focus);
    overviewCamera.alpha = -Math.PI * (lake ? 0.74 : 0.66);
    overviewCamera.beta = lake ? 1.2 : Math.PI / 3;
    const aspect = engine.getAspectRatio(overviewCamera);
    overviewCamera.fov = lake && aspect < 0.85 ? 1.05 : 0.8;
    // Fit the full exterior at the opening angle, including on narrow screens.
    const { alpha, beta, fov } = overviewCamera;
    const viewDirection = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
    const right = Vector3.Cross(Vector3.Up(), viewDirection).normalize();
    const up = Vector3.Cross(viewDirection, right);
    const halfHeight = Math.tan(fov / 2);
    const halfWidth = halfHeight * aspect;
    let distance = 0;
    for (const worldCorner of bounds.corners) {
      const corner = worldCorner.subtract(focus);
      const depth = Vector3.Dot(corner, viewDirection);
      const horizontal = Math.abs(Vector3.Dot(corner, right)) / halfWidth;
      const vertical = Math.abs(Vector3.Dot(corner, up)) / halfHeight;
      distance = Math.max(distance, depth + Math.max(horizontal, vertical));
    }
    distance *= 1.12;
    overviewCamera.radius = distance;
    overviewCamera.lowerRadiusLimit = bounds.radius * 0.45;
    overviewCamera.upperRadiusLimit = distance * 2;
    overviewCamera.upperBetaLimit = lake ? Math.PI / 2 - 0.05 : Math.PI - 0.01;
    overviewCamera.minZ = Math.min(0.5, bounds.radius * 0.02);
    overviewCamera.maxZ = Math.max(1000, distance * 2 + bounds.radius * 2);

    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    if (scene.activeCamera !== overviewCamera) {
      this.camera?.detachControl();
      scene.activeCamera = overviewCamera;
      overviewCamera.attachControl(this.canvas, false);
    }
    this.setView(view, grounds);
  }

  private returnToWalk(): void {
    const { scene, camera, overviewCamera } = this;
    if (!scene || !camera || !overviewCamera || scene.activeCamera !== overviewCamera) return;

    const grounds = this.zoneManager?.getCurrentZone();
    overviewCamera.detachControl();
    scene.activeCamera = camera;
    camera.attachControl(this.canvas, true);
    this.setView('walk', grounds instanceof CastleGroundsZone ? grounds : null);
  }

  private setupEventListeners(): void {
    // Request pointer lock only in walk mode.
    this.canvas.addEventListener('click', this.handleCanvasClick);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
  }

  private handleCanvasClick = (): void => {
    if (this.scene?.activeCamera === this.camera) {
      this.canvas.requestPointerLock()?.catch((err) => {
        console.warn('[BabylonEngine] Pointer lock unavailable:', err);
      });
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.zoneManager?.getCurrentZone()) return;

    if (e.code === 'KeyV' && !e.repeat) {
      void this.toggleOverview();
    } else if (e.code === 'KeyE' && this.scene?.activeCamera === this.camera) {
      this.zoneManager.handleInteract('use');
    } else if (e.code === 'Digit1' || e.code === 'Digit2') {
      this.returnToWalk();
      void this.zoneManager.switchZone(e.code === 'Digit1' ? 'exterior' : 'great_hall');
    }
  };

  private handleResize = (): void => {
    this.engine?.resize();
  };

  dispose(): void {
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);

    this.zoneManager?.dispose();
    this.environmentRenderer?.dispose();

    this.scene?.dispose();
    this.engine?.dispose();

    this.zoneManager = null;
    this.environmentRenderer = null;
    this.overviewCamera = null;
    this.camera = null;
    this.scene = null;
    this.engine = null;
  }
}
