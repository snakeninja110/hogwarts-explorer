import {
  Color3,
  Mesh,
  Scene,
  ShadowGenerator,
  PBRMaterial,
  Texture,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import {
  CASTLE_APPROACH, CLOCK_TOWER, CLOCK_TOWER_COURTYARD, CLOCK_TOWER_PLINTH, ENTRANCE_COURTYARD, GREAT_HALL,
  GREAT_HALL_ENTRANCE_Z, GREAT_HALL_FLOOR_Y, QUAD_TOWERS, QUAD_WING_PLINTH, STAIRCASE_QUAD,
} from '../castleLayout';
import { greatHallShell, type HallMaterials } from './GreatHallArchitecture';
import { greatHallOuterDoors } from './GreatHallEntrance';
import { entranceCourtyard } from './EntranceCourtyard';
import { courtyardTurret } from './CourtyardTurret';
import { boathouse, boathouseShore } from './Boathouse';
import { cliffSpur, cliffStaircase } from './CliffStaircase';
import { hallWindowGlass } from './HallWindowGlass';
import { gryffindorTower, hallTowerLink, mainTower, quadFlankTowers } from './MainTower';
import { hospitalWing, staircaseQuadrangle } from './StaircaseQuadrangle';
import { clockTower } from './ClockTower';
import { clockTowerCourtyard } from './ClockTowerCourtyard';
import { viaduct } from './Viaduct';
import { viaductRavine } from './ViaductRavine';
import { quadWalkway } from './QuadWalkway';
import { rockTerrain } from './RockTerrain';
import { stonePaving } from './StonePaving';
import { masonryBox, masonrySurface, place, TILE_METRES, type Face, type Masonry } from './Masonry';

const UP = new Vector3(0, 1, 0);
const { x: gateX, floorY, courtyardFrontZ } = CASTLE_APPROACH;
export const HALL_DOOR_BATCH = { open: 'great-hall-open-doors', closed: 'great-hall-closed-doors' };

// Batch by building and material so ornament does not add draw calls.
export class CastleExterior {
  static build(scene: Scene, shadows?: ShadowGenerator | null): Mesh[] {
    const builder = new CastleExterior(scene);
    builder.foundation();
    builder.quadrangleRearShelf();
    builder.clockTowerRidge();
    builder.buildings();
    return builder.finish(shadows);
  }

  private readonly batches = new Map<string, Map<PBRMaterial, Mesh[]>>();
  private readonly slateMaterials = new Set<PBRMaterial>();
  private building = 'castle';
  private readonly stone: PBRMaterial;
  private readonly trim: PBRMaterial;
  private readonly roof: PBRMaterial;
  private readonly rock: PBRMaterial;
  private readonly grass: PBRMaterial;
  private readonly wood: PBRMaterial;
  private readonly iron: PBRMaterial;
  private readonly amber: PBRMaterial;

  private constructor(private readonly scene: Scene) {
    this.stone = this.material('castle-ashlar', '#f3e8da');
    this.applySurface(this.stone, 'stone', 4, 0.67);
    this.roof = this.material('castle-slate', '#66707e');
    this.applySurface(this.roof, 'slate', 4, 0.6);
    this.roof.specularIntensity = 0.48;
    this.roof.environmentIntensity = 0.54;
    this.trim = this.material('castle-dressed-stone', '#a09584');
    this.applySurface(this.trim, 'stone', 4, 0.23);
    this.rock = this.material('castle-bedrock', '#a99b90');
    this.applySurface(this.rock, 'rock', 16, 1.2);
    this.rock.specularIntensity = 0.45;
    this.rock.environmentIntensity = 0.73;
    this.grass = this.material('castle-grass-and-gravel', '#c2bda7');
    this.applySurface(this.grass, 'grass', 16, 0.57);
    this.wood = this.material('castle-oak', '#3f2a21');
    this.iron = this.material('castle-iron', '#302d2b');
    this.amber = this.material('castle-amber-glass', '#3e2b21');
    this.amber.emissiveColor = new Color3(0.11, 0.048, 0.016);
  }

  private material(name: string, color: string): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = Color3.FromHexString(color).toLinearSpace();
    material.metallic = 0;
    material.roughness = 0.87;
    return material;
  }

  private applySurface(material: PBRMaterial, asset: string, metres: number, relief: number): void {
    if (asset === 'slate') this.slateMaterials.add(material);
    const texture = (map: 'color' | 'normal' | 'surface'): Texture => {
      const extension = map === 'surface' ? 'png' : 'jpg';
      const url = `${import.meta.env.BASE_URL}textures/castle/${asset}-${map}.${extension}`;
      const image = new Texture(url, this.scene);
      image.gammaSpace = map === 'color';
      image.uScale = TILE_METRES / metres;
      image.vScale = TILE_METRES / metres;
      image.anisotropicFilteringLevel = 8;
      return image;
    };

    material.albedoTexture = texture('color');
    material.bumpTexture = texture('normal');
    material.bumpTexture.level = relief;
    material.invertNormalMapY = true;
    // Poly Haven packs ambient occlusion, roughness and metallic into R, G and B.
    material.metallicTexture = texture('surface');
    material.roughness = 1;
    material.useAmbientOcclusionFromMetallicTextureRed = true;
    material.useRoughnessFromMetallicTextureGreen = true;
    material.useRoughnessFromMetallicTextureAlpha = false;
    material.useMetallnessFromMetallicTextureBlue = true;
  }

  private collect(mesh: Mesh, material: PBRMaterial): void {
    mesh.material = material;
    let batches = this.batches.get(this.building);
    if (!batches) {
      batches = new Map();
      this.batches.set(this.building, batches);
    }
    const batch = batches.get(material);
    if (batch) batch.push(mesh);
    else batches.set(material, [mesh]);
  }

  private box(material: PBRMaterial, center: Vector3, width: number, height: number, depth: number, yaw = 0): Mesh {
    const mesh = masonryBox(this.scene, material.name, center, width, height, depth, yaw, this.slateMaterials.has(material));
    this.collect(mesh, material);
    return mesh;
  }

  private surface(material: PBRMaterial, faces: Face[]): void {
    this.collect(masonrySurface(this.scene, material.name, faces), material);
  }

  private foundation(): void {
    const back = GREAT_HALL_ENTRANCE_Z + GREAT_HALL.length;
    const centerZ = (courtyardFrontZ + back) / 2;
    const { span } = STAIRCASE_QUAD;
    const centerX = gateX + 4;
    const courtEdge = ENTRANCE_COURTYARD.width / 2;
    const gryffindor = QUAD_TOWERS.gryffindor;
    const towerLedge = gryffindor.radius + 0.85;
    const quadRim = [
      [9, -8], [span - 6, -8.5], [span + 3, -5.8, -0.7], [span + 4.0, 4.5, -7.7],
      [span + 4.5, 20.5, -8.2], [span + 7.1, 26, -8.8],
      // The ledge follows the tower out over the ravine and returns beneath the lower wing.
      [gryffindor.across + towerLedge, gryffindor.depth - 3.1, -10.1],
      [gryffindor.across + towerLedge, gryffindor.depth + 3.9, -11.1],
      [gryffindor.across - 3.1, gryffindor.depth + towerLedge, -9.7],
      [span + 1.6, span + 6, -7.4], [26, span + 8.0, -2.5], [24, span + 7.2],
      [14, span + 7.3], [-5.4, span + 5.5],
    ].map(([across, depth, drop = 0]) => {
      const { x, z } = place(STAIRCASE_QUAD, across, floorY, depth);
      return [x - gateX, z, drop];
    });
    const outline = [
      [-courtEdge - 0.55, courtyardFrontZ - 0.6], [courtEdge + 0.55, courtyardFrontZ - 0.9],
      [courtEdge + 0.6, courtyardFrontZ + 1.9], [courtEdge + 0.28, 6.4],
      ...quadRim, [8.5, back + 2.5],
      [-4.1, back + 3.2], [-9.4, back + 1.6], [-10.7, GREAT_HALL_ENTRANCE_Z + 3],
    ].map(([offset, z, drop = 0]) => new Vector3(gateX + offset, floorY - 0.08 + drop, z));
    const rim = outline.flatMap((point, i) => [0, 0.25, 0.5, 0.75].map(t =>
      Vector3.Lerp(point, outline[(i + 1) % outline.length], t)));
    const shelves = [[0.83, 1.01], [0.63, 1.06], [0.50, 1.04], [0.23, 1.11], [0, 1.13]];
    const rings = [rim, ...shelves.map(([heightFraction, spread], layer) => rim.map(({ x, y, z }, i) => {
      const fracture = Math.sin(i * 2.31 + layer * 0.92);
      const strata = Math.sin(i * 0.6 - layer * 1.18);
      const radius = spread + 0.035 * fracture + 0.027 * strata;
      const height = heightFraction === 0 ? 0 : y * heightFraction + 0.87 * fracture + 0.6 * strata;
      return new Vector3(centerX + (x - centerX) * radius, height, centerZ + (z - centerZ) * radius);
    }))];
    const topCenter = new Vector3(centerX, floorY - 0.08, centerZ);
    this.cliffVolume(rings, topCenter);
    this.surface(this.grass, outline.map((point, i) => ({
      points: [topCenter, point, outline[(i + 1) % outline.length]], outward: UP,
    })));
  }

  private quadrangleRearShelf(): void {
    this.building = 'quad-clock-junction';
    const quad = STAIRCASE_QUAD;
    const plinth = QUAD_WING_PLINTH;
    const inner = quad.span - quad.wingWidth / 2 - plinth.innerOverhang;
    const outer = quad.span + quad.wingWidth / 2 + plinth.outerOverhang;
    const end = quad.span + quad.wingWidth / 2 + plinth.endOverhang;
    const acrossSections = [[15.8, 3.6], [17.5, 0], [23.2, 0], [26.5, 0], [30.3, 0],
      [end + 0.18, 0], [end + 2.3, 10.7]];
    const depthSections = [[inner - 1.4, 6.1], [inner - 0.15, 0], [inner + 2.7, 0],
      [outer + 0.2, 0], [outer + 1.1, 4.2], [outer + 2.4, 12.6]];
    // The crest meets the level plinth. Outside the wing it falls into the existing ravine wall.
    const grid = depthSections.map(([depth, setback], row) => acrossSections.map(([across, fall], col) =>
      place(quad, across, plinth.rearBottom + 0.56 - setback - fall + 0.18 * Math.sin(row * 1.6 + col * 2.1), depth)));
    rockTerrain({ surface: this.surface.bind(this) }, this.rock, grid);
  }

  private clockTowerRidge(): void {
    this.building = 'clock-tower-ridge';
    const tower = CLOCK_TOWER;
    const { end } = CLOCK_TOWER_COURTYARD;
    const rear = -CLOCK_TOWER_PLINTH.overhang - 0.54;
    const edge = tower.width / 2 + CLOCK_TOWER_PLINTH.overhang + 0.42;
    const rim = [
      [-edge, rear, 4.5], [-6.2, rear - 0.13, 2.15], [0.5, rear + 0.17, 1.0], [edge, rear + 0.09, 4.2],
      [edge + 0.21, 3.8, 3.0], [14.05, 11.1, 1.33], [12.38, 18.3, 0.91], [12.46, end - 3.2, 1.52],
      [11.90, end + 0.23, 1.46], [4.45, end + 1.16, 1.12], [2.65, end + 2.32, 1.53],
      [-2.55, end + 2.37, 1.63], [-7.2, end + 0.65, 1.38], [-11.80, end + 0.32, 1.48],
      [-12.45, 21.1, 1.28], [-13.65, 14.5, 1.36], [-14.25, 7.2, 2.43],
    ].map(([across, depth, drop]) => place(tower, across, tower.floor - drop, depth));
    const terraces = rim.flatMap((point, i) => [0, 0.31, 0.68].map(t =>
      Vector3.Lerp(point, rim[(i + 1) % rim.length], t)));
    const center = place(tower, 0, tower.floor - 1.2, end * 0.46);
    const sections = [[0.84, 1.04], [0.68, 1.13], [0.48, 1.18], [0.28, 1.30], [0, 1.47]];
    const rings = [terraces, ...sections.map(([height, spread], layer) => terraces.map((point, i) => {
      const fissure = Math.sin(i * 2.29 + layer * 0.61);
      const layerShift = Math.sin(i * 0.61 - layer * 1.37);
      // Recesses in the cliff face still need to stay outside the crest below the footing.
      const radius = Math.max(1, spread + fissure * 0.08 + layerShift * 0.06);
      return new Vector3(
        center.x + (point.x - center.x) * radius,
        height === 0 ? 0 : point.y * height + fissure * 1.45 + layerShift * 1.16,
        center.z + (point.z - center.z) * radius,
      );
    }))];
    this.cliffVolume(rings, center);
    this.surface(this.rock, terraces.map((point, i) => ({
      points: [center, point, terraces[(i + 1) % terraces.length]], outward: UP,
    })));
  }

  private cliffVolume(rings: Vector3[][], center: Vector3): void {
    const rim = rings[0];
    const stride = rim.length + 1;
    const distances = [0];
    for (let i = 0; i < rim.length; i++) {
      distances.push(distances[i] + Vector3.Distance(rim[i], rim[(i + 1) % rim.length]));
    }
    const perimeter = distances[rim.length];
    const repeats = 2 * Math.round(perimeter / (2 * TILE_METRES));
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    rings.forEach((ring, layer) => {
      [...ring, ring[0]].forEach(({ x, y, z }, i) => {
        positions.push(x, y, z);
        uvs.push(distances[i] * repeats / perimeter, y / TILE_METRES);
        if (layer > 0 && i < rim.length) {
          const lower = layer * stride + i;
          const upper = lower - stride;
          indices.push(lower, lower + 1, upper + 1, lower, upper + 1, upper);
        }
      });
    });

    VertexData.ComputeNormals(positions, indices, normals);
    for (let layer = 0; layer < rings.length; layer++) {
      const first = 3 * layer * stride;
      const last = first + 3 * rim.length;
      const normal = Vector3.FromArray(normals, first).add(Vector3.FromArray(normals, last)).normalize();
      normal.toArray(normals, first);
      normal.toArray(normals, last);
    }
    const mesh = new Mesh('castle-cliff-faces', this.scene);
    const data = new VertexData();
    Object.assign(data, { positions, normals, indices, uvs });
    data.applyToMesh(mesh);
    this.collect(mesh, this.rock);
    const base = rings[rings.length - 1];
    const bottom = new Vector3(center.x, base[0].y, center.z);
    const down = Vector3.Down();
    this.surface(this.rock, base.map((point, i) => ({
      points: [bottom, point, base[(i + 1) % base.length]], outward: down,
    })));
  }

  private buildings(): void {
    const geometry: Masonry<PBRMaterial> = {
      box: this.box.bind(this),
      surface: this.surface.bind(this),
    };
    const clockMetal = this.material('hall-clock-metal', '#d5cdb8');
    clockMetal.roughness = 0.64;
    clockMetal.emissiveColor = new Color3(0.12, 0.105, 0.078);
    const clockRecess = this.material('hall-clock-recess', '#66534c');
    this.applySurface(clockRecess, 'stone', 2.3, 0.32);
    const portalTrim = this.material('hall-carved-stone', '#b7a59c');
    this.applySurface(portalTrim, 'stone', 2.25, 0.16);
    const entryPaving = this.material('hall-entry-flagstones', '#b9babc');
    entryPaving.albedoTexture = stonePaving(this.scene, 4.2, ['#757779', '#7b7d7f', '#6e7073', '#797b7d', '#7d7f82']);
    const entryGlass = this.material('hall-entry-leaded-glass', '#a6adb2');
    entryGlass.albedoTexture = hallWindowGlass(this.scene, true, false);
    entryGlass.emissiveTexture = entryGlass.albedoTexture;
    entryGlass.emissiveColor.set(0.13, 0.14, 0.15);
    const mat: HallMaterials<PBRMaterial> = {
      stone: this.stone, trim: this.trim, slate: this.roof,
      iron: this.iron, glass: this.amber, door: this.wood, clockMetal, clockRecess, portalTrim, entryGlass, entryPaving,
    };
    this.building = 'great-hall-courtyard';
    const courtPaving = this.material('courtyard-setts', '#aab1b7');
    courtPaving.albedoTexture = stonePaving(this.scene, 1.62, ['#8d9399', '#969da5', '#858d95', '#9299a1', '#9da3a8']);
    const arcadeRoof = this.material('courtyard-arcade-roof', '#b9b4a4');
    this.applySurface(arcadeRoof, 'stone', 2.6, 0.25);
    entranceCourtyard(geometry, mat, courtPaving, arcadeRoof);

    this.building = 'great-hall';
    const { width, length } = GREAT_HALL;
    const baseHeight = GREAT_HALL_FLOOR_Y - floorY + 1.4;
    this.box(this.stone, new Vector3(gateX, GREAT_HALL_FLOOR_Y - baseHeight / 2, GREAT_HALL_ENTRANCE_Z + length / 2),
      width + 1.8, baseHeight, length);
    this.box(this.trim, new Vector3(gateX, GREAT_HALL_FLOOR_Y - 0.11, GREAT_HALL_ENTRANCE_Z + length / 2),
      width + 2, 0.22, length);
    const rearGlass = this.material('hall-rear-glass', '#4d473e');
    rearGlass.albedoTexture = hallWindowGlass(this.scene);
    rearGlass.roughness = 0.4;
    rearGlass.environmentIntensity = 0.46;
    const rearTrim = this.material('hall-rear-window-stone', '#d5c7b4');
    this.applySurface(rearTrim, 'stone', 2, 0.12);
    const hallEntrance = { x: gateX, z: GREAT_HALL_ENTRANCE_Z, yaw: 0 };
    greatHallShell(geometry, { ...mat, rearGlass, rearTrim }, hallEntrance, GREAT_HALL_FLOOR_Y, true);
    this.building = HALL_DOOR_BATCH.open;
    greatHallOuterDoors(geometry, mat, hallEntrance, GREAT_HALL_FLOOR_Y, false);
    this.building = HALL_DOOR_BATCH.closed;
    greatHallOuterDoors(geometry, mat, hallEntrance, GREAT_HALL_FLOOR_Y, true);

    this.building = 'hall-tower-link';
    hallTowerLink(geometry, mat);

    this.building = 'main-tower';
    const towerStone = this.material('main-tower-ashlar', '#e0cfbf');
    this.applySurface(towerStone, 'stone', 2.7, 0.31);
    mainTower(geometry, { ...mat, stone: towerStone });

    this.building = 'staircase-quadrangle';
    staircaseQuadrangle(geometry, mat);
    this.building = 'quadrangle-flank-towers';
    quadFlankTowers(geometry, { ...mat, stone: towerStone });
    this.building = 'hospital-wing';
    hospitalWing(geometry, mat);
    this.building = 'gryffindor-tower';
    gryffindorTower(geometry, { ...mat, stone: towerStone });

    const clockStone = this.material('clock-tower-ashlar', '#e6d8c9');
    this.applySurface(clockStone, 'stone', 2.8, 0.27);
    const clockBronze = this.material('clock-tower-bronze', '#a09983');
    clockBronze.specularIntensity = 0.26;
    clockBronze.environmentIntensity = 0.45;
    const clockShadow = this.material('clock-tower-recess', '#28251f');
    const clockMaterials = { ...mat, stone: clockStone, clockMetal: clockBronze, clockRecess: clockShadow };
    this.building = 'clock-tower';
    clockTower(geometry, clockMaterials);
    this.building = 'clock-tower-courtyard';
    const clockPaving = this.material('clock-courtyard-flagstones', '#82807a');
    clockPaving.albedoTexture = stonePaving(this.scene, 2.12, ['#767472', '#807d76', '#737371', '#82817a', '#6d6c69']);
    clockPaving.roughness = 1;
    clockPaving.specularIntensity = 0.05;
    clockPaving.environmentIntensity = 0.35;
    clockTowerCourtyard(geometry, clockMaterials, clockPaving, this.grass);

    this.building = 'viaduct-ravine';
    const ravineRock = this.material('viaduct-rock', '#a69a92');
    this.applySurface(ravineRock, 'rock', 7.8, 1.04);
    viaductRavine(geometry, ravineRock);
    this.building = 'viaduct';
    const bridgeStone = this.material('viaduct-masonry', '#d3baaa');
    this.applySurface(bridgeStone, 'stone', 2.85, 0.43);
    const bridgeTrim = this.material('viaduct-dressed-stone', '#dccac0');
    this.applySurface(bridgeTrim, 'stone', 3.0, 0.15);
    viaduct(geometry, { stone: bridgeStone, trim: bridgeTrim, paving: this.trim });
    this.building = 'quad-walkway';
    quadWalkway(geometry, bridgeStone, bridgeTrim, this.trim, this.grass);

    this.building = 'courtyard-turret';
    const turretStone = this.material('courtyard-turret-masonry', '#ddc2b4');
    this.applySurface(turretStone, 'stone', 2.5, 0.36);
    courtyardTurret(geometry, { ...mat, stone: turretStone });

    this.building = 'boathouse';
    const boatStone = this.material('boathouse-warm-masonry', '#dbada2');
    this.applySurface(boatStone, 'stone', 1.8, 0.29);
    const boatTower = this.material('boathouse-tower-masonry', '#9c8995');
    this.applySurface(boatTower, 'stone', 1.38, 0.26);
    const boatSlate = this.material('boathouse-blue-slate', '#68798d');
    this.applySurface(boatSlate, 'slate', 2.3, 0.53);
    boathouse(geometry, { ...mat, stone: boatStone, tower: boatTower, slate: boatSlate });
    boathouseShore(geometry, this.rock);
    this.building = 'cliff-staircase';
    cliffSpur(geometry, this.rock);
    const stairStone = this.material('cliff-stair-masonry', '#bfab9f');
    this.applySurface(stairStone, 'stone', 2.55, 0.32);
    const stairCoping = this.material('cliff-stair-coping', '#c7c0b6');
    this.applySurface(stairCoping, 'stone', 2.9, 0.13);
    cliffStaircase(geometry, stairStone, stairCoping, this.iron, this.amber);
  }

  private finish(shadows?: ShadowGenerator | null): Mesh[] {
    const materials = new Set<PBRMaterial>();
    return Array.from(this.batches).flatMap(([building, batches]) =>
      Array.from(batches, ([material, parts]) => {
        const mesh = Mesh.MergeMeshes(parts, true, true)!;
        mesh.name = building === 'castle' ? material.name : building + '-' + material.name;
        if (building === HALL_DOOR_BATCH.closed) mesh.setEnabled(false);
        mesh.checkCollisions = false;
        const glass = material === this.amber;
        if (shadows && !glass) shadows.addShadowCaster(mesh);
        mesh.receiveShadows = Boolean(shadows) && !glass;
        if (!materials.has(material)) {
          materials.add(material);
          mesh.onDisposeObservable.addOnce(() => material.dispose(false, true));
        }
        return mesh;
      }),
    );
  }
}
