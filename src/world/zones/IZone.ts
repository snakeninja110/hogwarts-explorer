import { Scene, Vector3, ShadowGenerator } from '@babylonjs/core';

export interface IZone {
  readonly id: string;
  readonly name: string;
  readonly spawnPoint: Vector3;
  readonly spawnTarget: Vector3;

  load(scene: Scene, shadowGenerator?: ShadowGenerator | null): Promise<void>;
  unload(): void;
  update(playerPosition: Vector3): void;
  getInteractionHint(playerPosition: Vector3): string | null;
  onInteract?(action: string): void;
}
