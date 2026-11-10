import {
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
} from '@babylonjs/core';

export interface BabylonEngineCallbacks {
  onSceneReady: () => void;
  onZoneChange: (zone: string) => void;
  onInteractionHint: (hint: string | null) => void;
}

export class BabylonEngine {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: UniversalCamera | null = null;
  private canvas: HTMLCanvasElement;
  private callbacks: BabylonEngineCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: BabylonEngineCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    // Create engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.01, 0.01, 0.05, 1); // Dark night sky
    this.scene.collisionsEnabled = true;

    // Setup camera (first-person)
    this.setupCamera();

    // Setup placeholder scene (Phase 1 — will be replaced with real models)
    this.setupPlaceholderScene();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });

    // Notify React that scene is ready
    this.callbacks.onSceneReady();
  }

  private setupCamera(): void {
    if (!this.scene) return;

    this.camera = new UniversalCamera(
      'playerCamera',
      new Vector3(0, 1.7, -10), // Eye height ~1.7m
      this.scene,
    );

    this.camera.setTarget(Vector3.Zero());

    // WASD controls
    this.camera.keysUp = [87]; // W
    this.camera.keysDown = [83]; // S
    this.camera.keysLeft = [65]; // A
    this.camera.keysRight = [68]; // D
    this.camera.speed = 0.5;
    this.camera.angularSensibility = 2000;
    this.camera.inertia = 0.7;

    // Collisions & gravity
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new Vector3(0.5, 0.9, 0.5); // Collision ellipsoid

    // Mouse look — lock pointer on click
    this.scene.onPointerDown = () => {
      this.canvas.requestPointerLock();
    };

    this.camera.attachControl(this.canvas, true);
  }

  private setupPlaceholderScene(): void {
    if (!this.scene) return;

    // Ambient light
    const ambientLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene,
    );
    ambientLight.intensity = 0.3;
    ambientLight.diffuse = new Color3(0.6, 0.6, 0.8); // Moonlight tint

    // Ground plane
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: 100, height: 100 },
      this.scene,
    );
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.15, 0.2, 0.1); // Dark grass
    ground.material = groundMat;
    ground.checkCollisions = true;

    // Placeholder castle — a few boxes to represent the structure
    const castleBase = MeshBuilder.CreateBox(
      'castleBase',
      { width: 20, height: 10, depth: 15 },
      this.scene,
    );
    castleBase.position.y = 5;
    const castleMat = new StandardMaterial('castleMat', this.scene);
    castleMat.diffuseColor = new Color3(0.4, 0.35, 0.3); // Stone color
    castleBase.material = castleMat;
    castleBase.checkCollisions = true;

    // Tower 1
    const tower1 = MeshBuilder.CreateCylinder(
      'tower1',
      { diameter: 5, height: 18 },
      this.scene,
    );
    tower1.position = new Vector3(-10, 9, -5);
    tower1.material = castleMat;
    tower1.checkCollisions = true;

    // Tower 2
    const tower2 = MeshBuilder.CreateCylinder(
      'tower2',
      { diameter: 4, height: 22 },
      this.scene,
    );
    tower2.position = new Vector3(10, 11, 5);
    tower2.material = castleMat;
    tower2.checkCollisions = true;

    // Tower 3
    const tower3 = MeshBuilder.CreateCylinder(
      'tower3',
      { diameter: 4.5, height: 16 },
      this.scene,
    );
    tower3.position = new Vector3(8, 8, -7);
    tower3.material = castleMat;
    tower3.checkCollisions = true;

    // Set gravity
    this.scene.gravity = new Vector3(0, -0.15, 0);
  }

  private handleResize = (): void => {
    this.engine?.resize();
  };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.scene?.dispose();
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
    this.camera = null;
  }
}
