import {
  Scene,
  SceneLoader,
  AbstractMesh,
  ShadowGenerator,
  Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { CastleExterior } from '../world/generators/CastleExterior';

export class AssetLoader {
  /**
   * Attempts to load external glTF/GLB model from `/models/hogwarts_castle.glb`.
   * Automatically falls back to high-detail procedural castle meshes if not found.
   */
  static async loadCastleModel(
    scene: Scene,
    shadowGenerator?: ShadowGenerator | null,
  ): Promise<AbstractMesh[]> {
    const modelUrl = '/models/hogwarts_castle.glb';

    try {
      // Test if file exists before import
      const res = await fetch(modelUrl, { method: 'HEAD' });
      if (scene.isDisposed) return [];
      if (!res.ok || res.headers.get('Content-Type')?.includes('text/html')) {
        throw new Error(`File ${modelUrl} unavailable as GLB (status ${res.status})`);
      }

      console.info(`[AssetLoader] Loading external castle model from ${modelUrl}...`);
      const result = await SceneLoader.ImportMeshAsync('', '', modelUrl, scene);
      if (scene.isDisposed) return [];

      // Decouple visual meshes from collision computation (ADR-0002)
      result.meshes.forEach((mesh) => {
        mesh.checkCollisions = false;
        if (shadowGenerator && mesh.name !== '__root__') {
          shadowGenerator.addShadowCaster(mesh as Mesh, true);
        }
      });

      console.info(`[AssetLoader] Successfully loaded external castle model (${result.meshes.length} meshes).`);
      return result.meshes;
    } catch (err) {
      if (scene.isDisposed) return [];
      console.warn(
        `[AssetLoader] External model unavailable (${(err as Error).message}). Initializing Procedural Fallback Mesh...`,
      );
      return CastleExterior.build(scene, shadowGenerator);
    }
  }

}
