import { Scene, UniversalCamera, Vector3, ShadowGenerator } from '@babylonjs/core';
import { IZone } from './IZone';
import { CastleGroundsZone } from './CastleGroundsZone';
import { GreatHallZone } from './GreatHallZone';

export interface ZoneManagerCallbacks {
  onZoneChange: (zoneId: string) => void;
  onInteractionHint: (hint: string | null) => void;
}

export class ZoneManager {
  private scene: Scene;
  private camera: UniversalCamera;
  private callbacks: ZoneManagerCallbacks;
  private currentZone: IZone | null = null;
  private registeredZones: Map<string, () => IZone> = new Map();
  private lastHint: string | null = null;
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(scene: Scene, camera: UniversalCamera, callbacks: ZoneManagerCallbacks) {
    this.scene = scene;
    this.camera = camera;
    this.callbacks = callbacks;

    // Register primary zones with bidirectional transitions
    const handleTransition = (targetId: string) => {
      this.loadZone(targetId, this.shadowGenerator).catch((err) => {
        console.error(`[ZoneManager] Transition to ${targetId} failed:`, err);
      });
    };

    this.registerZone('exterior', () => new CastleGroundsZone({ onTransitionToZone: handleTransition }));
    this.registerZone('great_hall', () => new GreatHallZone({ onTransitionToZone: handleTransition }));
  }

  registerZone(id: string, factory: () => IZone): void {
    this.registeredZones.set(id, factory);
  }

  async loadZone(zoneId: string, shadowGenerator?: ShadowGenerator | null): Promise<void> {
    if (shadowGenerator !== undefined) {
      this.shadowGenerator = shadowGenerator;
    }

    const factory = this.registeredZones.get(zoneId);
    if (!factory) {
      console.error(`[ZoneManager] Unknown zone: ${zoneId}`);
      return;
    }

    if (this.currentZone) {
      console.info(`[ZoneManager] Unloading previous zone: ${this.currentZone.id}`);
      this.currentZone.unload();
      this.currentZone = null;
    }

    const nextZone = factory();
    console.info(`[ZoneManager] Loading zone: ${zoneId} (${nextZone.name})...`);
    await nextZone.load(this.scene, this.shadowGenerator);
    if (this.scene.isDisposed) return;
    this.currentZone = nextZone;

    // Position player camera at zone spawn point
    this.camera.position = nextZone.spawnPoint.clone();
    this.camera.setTarget(nextZone.spawnTarget.clone());

    this.callbacks.onZoneChange(zoneId);
    this.updateInteractionHint(this.camera.position);
  }

  update(playerPosition: Vector3): void {
    if (!this.currentZone) return;

    this.currentZone.update(playerPosition);
    this.updateInteractionHint(playerPosition);
  }

  private updateInteractionHint(playerPosition: Vector3): void {
    if (!this.currentZone) return;

    const hint = this.currentZone.getInteractionHint(playerPosition);
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.callbacks.onInteractionHint(hint);
    }
  }

  handleInteract(action: string = 'use'): void {
    if (!this.currentZone) return;

    const hint = this.currentZone.getInteractionHint(this.camera.position);
    if (hint && this.currentZone.onInteract) {
      this.currentZone.onInteract(action);
    }
  }

  async switchZone(zoneId: string): Promise<void> {
    await this.loadZone(zoneId);
  }

  getCurrentZone(): IZone | null {
    return this.currentZone;
  }

  dispose(): void {
    if (this.currentZone) {
      this.currentZone.unload();
      this.currentZone = null;
    }
    this.registeredZones.clear();
  }
}
