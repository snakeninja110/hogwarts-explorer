import { AbstractMesh, Color3, Mesh, MeshBuilder, PointLight, Scene, ShadowGenerator, StandardMaterial, Texture, Vector3 } from '@babylonjs/core';
import { GREAT_HALL, WALL_DEPTH } from '../castleLayout';
import { greatHallShell } from './GreatHallArchitecture';
import { hallVestibuleColliders, hallVestibuleSteps } from './GreatHallEntrance';
import { hallWindowGlass } from './HallWindowGlass';
import { masonryBox, masonrySurface, TILE_METRES, type Masonry } from './Masonry';
import { stonePaving } from './StonePaving';
import { stairRun, stoneStairs } from './StoneStairs';

export interface HallsDemoResult {
  meshes: AbstractMesh[];
  lights: PointLight[];
}

export class HallsDemo {
  static build(scene: Scene, shadow?: ShadowGenerator | null): HallsDemoResult {
    const { width, length, eave } = GREAT_HALL;
    const materials: StandardMaterial[] = [];
    const meshes: AbstractMesh[] = [];
    const lights: PointLight[] = [];

    function material(name: string, color: string, surface?: string): StandardMaterial {
      const mat = new StandardMaterial(name, scene);
      mat.diffuseColor = Color3.FromHexString(color);
      mat.specularColor = new Color3(0.09, 0.08, 0.07);
      if (surface) {
        const texture = new Texture(import.meta.env.BASE_URL + 'textures/castle/' + surface + '-color.jpg', scene);
        texture.uScale = texture.vScale = TILE_METRES / 4;
        texture.anisotropicFilteringLevel = 8;
        mat.diffuseTexture = texture;
      }
      materials.push(mat);
      return mat;
    }

    const stone = material('hall-ashlar', '#c1beb8');
    stone.diffuseTexture = stonePaving(scene, 4.2, ['#868c91', '#91969a', '#7f868d', '#898e93', '#9a9fa3']);
    const trim = material('hall-dressed-stone', '#777875');
    const slate = material('hall-slate', '#778391', 'slate');
    slate.emissiveColor.set(0.11, 0.12, 0.14);
    slate.emissiveTexture = slate.diffuseTexture;
    const door = material('hall-door-oak', '#694336');
    const oak = material('hall-table-oak', '#78512f');
    const iron = material('hall-iron', '#25282d');
    const paving = material('hall-flagstones', '#e4e6ea');
    paving.diffuseTexture = stonePaving(scene, 4.9, ['#717881', '#7c828a', '#747a84', '#818891', '#777f8a']);
    const glass = material('hall-glass', '#363d44');
    glass.emissiveTexture = hallWindowGlass(scene, true, false);
    glass.emissiveTexture.level = 0.79;
    const rearGlass = material('hall-rear-glass', '#363d44');
    rearGlass.emissiveTexture = hallWindowGlass(scene, true);
    rearGlass.emissiveTexture.level = 0.85;
    const rearTrim = material('hall-rear-window-stone', '#b2b4ab', 'stone');
    const wax = material('hall-wax', '#e2dccd');
    wax.emissiveColor = new Color3(0.43, 0.38, 0.29);
    const flame = material('hall-flame', '#f0ad62');
    flame.emissiveColor = new Color3(1, 0.57, 0.17);

    const batches = new Map<StandardMaterial, Mesh[]>();
    function collect(part: Mesh, mat: StandardMaterial): Mesh {
      part.material = mat;
      const batch = batches.get(mat);
      if (batch) batch.push(part);
      else batches.set(mat, [part]);
      return part;
    }
    const geometry: Masonry<StandardMaterial> = {
      box: (mat, at, w, h, d, yaw) => collect(masonryBox(scene, mat.name, at, w, h, d, yaw, mat === slate), mat),
      surface: (mat, faces) => { collect(masonrySurface(scene, mat.name, faces), mat); },
    };

    greatHallShell(geometry, { stone, trim, slate, door, iron, glass, rearGlass, rearTrim, entryGlass: glass, entryPaving: paving },
      { x: 0, z: 0, yaw: 0 }, 0, false);

    function box(mat: StandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number): Mesh {
      return geometry.box(mat, new Vector3(x, y, z), w, h, d);
    }
    function collider(name: string, x: number, y: number, z: number, w: number, h: number, d: number): Mesh {
      const proxy = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      proxy.position.set(x, y, z);
      proxy.isVisible = false;
      proxy.checkCollisions = true;
      meshes.push(proxy);
      return proxy;
    }
    function light(x: number, y: number, z: number, intensity: number, range: number): void {
      const lamp = new PointLight('hall-light', new Vector3(x, y, z), scene);
      lamp.diffuse = new Color3(0.94, 0.94, 0.97);
      lamp.intensity = intensity;
      lamp.range = range;
      lights.push(lamp);
    }

    box(paving, 0, -0.17, length / 2, width + WALL_DEPTH, 0.34, length);
    collider('hall-floor', 0, -0.2, length / 2, width, 0.4, length);
    for (const side of [-1, 1]) {
      collider('hall-side-wall', side * width / 2, eave / 2, length / 2, WALL_DEPTH, eave, length);
    }
    collider('hall-end-wall', 0, eave / 2, length, width, eave, WALL_DEPTH);
    for (const part of hallVestibuleColliders) {
      collider('hall-vestibule', part.x, part.y, part.z, part.width, part.height, part.depth);
    }
    const entryStair = hallVestibuleSteps;
    collider('hall-vestibule-stair', entryStair.center.x, entryStair.center.y - 0.058, entryStair.center.z,
      entryStair.width, 0.12, entryStair.slopeLength).rotation.x = entryStair.angle;
    collider('hall-vestibule-exit', 0, 0.72, -GREAT_HALL.entryBayDepth - 0.07, GREAT_HALL.entryWidth, 4.1, 0.16);

    const tableLength = length - 9;
    const tableCenter = 4.3 + tableLength / 2;
    for (const x of [-4.8, -2.64, 2.64, 4.8]) {
      box(oak, x, 0.81, tableCenter, 0.96, 0.11, tableLength);
      collider('hall-long-table', x, 0.41, tableCenter, 0.96, 0.82, tableLength);
      for (const side of [-1, 1]) {
        box(oak, x + side * 0.71, 0.43, tableCenter, 0.28, 0.10, tableLength);
        collider('hall-bench', x + side * 0.71, 0.23, tableCenter, 0.28, 0.46, tableLength);
      }
      for (let i = 0; i < 10; i++) {
        const z = tableCenter + (i / 9 - 0.5) * (tableLength - 1.45);
        box(oak, x, 0.69, z, 0.84, 0.12, 0.16);
        for (const side of [-1, 1]) {
          box(oak, x + side * 0.32, 0.35, z, 0.13, 0.70, 0.15);
          box(oak, x + side * 0.71, 0.20, z, 0.13, 0.40, 0.17);
        }
      }
      box(oak, x, 0.34, tableCenter, 0.12, 0.11, tableLength - 1.4);
    }

    const dais = length - 2.48;
    const daisWidth = width - WALL_DEPTH;
    const daisSteps = stairRun({ x: 0, y: 0, z: length - 4.1 }, { x: 0, y: 0.36, z: length - 3.45 }, daisWidth, 2);
    stoneStairs(geometry, paving, trim, daisSteps);
    collider('staff-dais-steps', 0, daisSteps.center.y - 0.058, daisSteps.center.z,
      daisWidth, 0.12, daisSteps.slopeLength).rotation.x = daisSteps.angle;
    box(paving, 0, 0.18, length - 1.825, daisWidth, 0.36, 3.25);
    collider('staff-dais', 0, 0.18, length - 1.825, daisWidth, 0.36, 3.25);
    box(oak, 0, 1.17, dais, width - 2.4, 0.13, 0.81);
    collider('staff-table', 0, 0.77, dais, width - 2.4, 0.82, 0.81);
    for (const x of [-4.15, -2.49, -0.83, 0.83, 2.49, 4.15]) {
      box(oak, x, 0.74, dais, 0.16, 0.76, 0.56);
      const chairZ = dais + 0.88;
      box(oak, x, 0.80, chairZ, 0.48, 0.10, 0.49);
      box(oak, x, 1.26, chairZ + 0.23, 0.38, 0.91, 0.10);
      geometry.surface(oak, [-1, 1].map(side => ({
        points: [new Vector3(x - 0.19, 1.70, chairZ + 0.23 + side * 0.05),
          new Vector3(x + 0.19, 1.70, chairZ + 0.23 + side * 0.05),
          new Vector3(x, 1.98, chairZ + 0.23 + side * 0.05)],
        outward: new Vector3(0, 0, side),
      })));
      for (const side of [-1, 1]) {
        box(oak, x + side * 0.19, 0.56, chairZ, 0.07, 0.4, 0.40);
      }
    }

    for (const z of [4, 13, 22, 31]) light(0, 5.3, z, 0.84, 14);
    light(0, 3.8, -2.0, 0.64, 8);
    light(0, 5.7, dais, 0.78, 12);

    for (const [mat, parts] of batches) {
      const merged = Mesh.MergeMeshes(parts, true, true)!;
      merged.name = mat.name;
      merged.receiveShadows = Boolean(shadow) && mat !== glass && mat !== rearGlass;
      meshes.push(merged);
    }
    meshes[0].onDisposeObservable.addOnce(() => materials.forEach(mat => mat.dispose(false, true)));

    const candle = MeshBuilder.CreateCylinder('gh_cdl', { diameter: 0.095, height: 0.46, tessellation: 6 }, scene);
    candle.material = wax;
    const tip = MeshBuilder.CreateSphere('gh_flm', { diameter: 0.12, segments: 4 }, scene);
    tip.scaling.y = 1.85;
    tip.material = flame;
    for (let i = 0; i < 120; i++) {
      const x = (i % 6 - 2.5) * 1.70 + 0.48 * Math.sin(i * 2.4);
      const y = 7.4 + 2.25 * Math.cos(i * 2.3);
      const z = 4 + Math.floor(i / 6) * (length - 7) / 19 + 0.66 * Math.sin(i * 1.9);
      const body = i === 0 ? candle : candle.createInstance('gh_cdl' + i);
      const fire = i === 0 ? tip : tip.createInstance('gh_flm' + i);
      body.position.set(x, y, z);
      fire.position.set(x, y + 0.32, z);
      meshes.push(body, fire);
    }
    return { meshes, lights };
  }
}
