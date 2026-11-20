import {
  Scene,
  Vector3,
  AbstractMesh,
  PointLight,
  ShadowGenerator,
} from '@babylonjs/core';
import { IZone } from './IZone';
import { HallsDemo } from '../generators/HallsDemo';
import { GREAT_HALL } from '../castleLayout';

export interface GreatHallZoneCallbacks {
  onTransitionToZone?: (zoneId: string) => void;
}

export class GreatHallZone implements IZone {
  readonly id = 'great_hall';
  readonly name = 'Great Hall';

  // Enter immediately inside the portal at the end of the exterior courtyard.
  readonly spawnPoint = new Vector3(0, 1.8, 2.6);
  readonly spawnTarget = new Vector3(0, 2.7, GREAT_HALL.length - 3.1);

  private meshes: AbstractMesh[] = [];
  private lights: PointLight[] = [];
  private candles: { mesh: AbstractMesh; height: number }[] = [];
  private exitTriggerPos = new Vector3(0, 1.8 - GREAT_HALL.innerStairRise, -GREAT_HALL.entryBayDepth);
  private exitTriggerRadius = 1.55;
  private animTime = 0;
  private callbacks?: GreatHallZoneCallbacks;

  constructor(callbacks?: GreatHallZoneCallbacks) {
    this.callbacks = callbacks;
  }

  async load(scene: Scene, shadowGenerator?: ShadowGenerator | null): Promise<void> {
    const demo = HallsDemo.build(scene, shadowGenerator);
    this.meshes = demo.meshes;
    this.lights = demo.lights;

    // Collect floating candle meshes for subtle hover animation
    this.candles = this.meshes.filter((m) =>
      m.name.startsWith('gh_cdl') || m.name.startsWith('gh_flm'),
    ).map(mesh => ({ mesh, height: mesh.position.y }));
  }

  update(_playerPosition: Vector3): void {
    // Subtle magical bobbing animation for floating candles
    this.animTime += this.candles[0]?.mesh.getEngine().getDeltaTime() / 1000 || 0;
    for (const [i, { mesh, height }] of this.candles.entries()) {
      mesh.position.y = height + Math.sin(this.animTime * 1.2 + Math.floor(i / 2) * 0.58) * 0.075;
    }
  }

  getInteractionHint(playerPosition: Vector3): string | null {
    const distToExit = Vector3.Distance(playerPosition, this.exitTriggerPos);
    if (distToExit <= this.exitTriggerRadius) {
      return 'Press [E] to Exit to Castle Grounds';
    }
    return null;
  }

  onInteract(action: string): void {
    console.info(`[GreatHallZone] Player interacted: ${action} at entrance doors.`);
    if (this.callbacks?.onTransitionToZone) {
      this.callbacks.onTransitionToZone('exterior');
    }
  }

  unload(): void {
    this.meshes.forEach((m) => m.dispose());
    this.meshes = [];

    this.lights.forEach((l) => l.dispose());
    this.lights = [];

    this.candles = [];
  }
}
