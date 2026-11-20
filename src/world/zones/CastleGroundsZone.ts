import {
  Scene,
  Vector3,
  AbstractMesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Color3,
  PointLight,
  ShadowGenerator,
  Mesh,
} from '@babylonjs/core';
import { IZone } from './IZone';
import { BlackLake } from '../../rendering/BlackLake';
import {
  BOATHOUSE, CASTLE_APPROACH, COURTYARD_BACK_Z, COURTYARD_INNER_BACK_Z, COURTYARD_INNER_FRONT_Z,
  COURTYARD_INNER_HALF_WIDTH, COURTYARD_SIDE_ENTRY_Z, COURTYARD_TURRET,
  ENTRANCE_COURTYARD, GREAT_HALL, GREAT_HALL_DOOR_Z, GREAT_HALL_ENTRANCE_Z, GREAT_HALL_FLOOR_Y, HALL_TOWER_LINK,
  HOSPITAL_WING, MAIN_TOWER, QUAD_ENTRY, QUAD_TOWERS, STAIRCASE_QUAD, VIADUCT, VIADUCT_ENTRY_Z,
} from '../castleLayout';
import { CastleExterior, HALL_DOOR_BATCH } from '../generators/CastleExterior';
import { boatDecks, boatPortal, boatRearDoor } from '../generators/Boathouse';
import { cliffGateLink, cliffLandings, cliffStairRuns, cliffWallColliders } from '../generators/CliffStaircase';
import { courtyardInnerFrontBays, courtyardInnerSideBays, hallDoorLanding, hallDoorSteps } from '../generators/EntranceCourtyard';
import { hallVestibuleColliders, hallVestibuleSteps } from '../generators/GreatHallEntrance';
import { VIADUCT_RAIL, viaductApproach, viaductLanding, viaductRailings } from '../generators/Viaduct';
import { quadPortalFloor, quadWalkwayFloors, quadWalkwayRails, quadWalkwayTerrace } from '../generators/QuadWalkway';
import { masonrySurface, place } from '../generators/Masonry';

const { x: gateX, floorY, courtyardFrontZ } = CASTLE_APPROACH;

export interface CastleGroundsZoneCallbacks {
  onTransitionToZone?: (zoneId: string) => void;
}

export class CastleGroundsZone implements IZone {
  readonly id = 'exterior';
  readonly name = 'Castle Grounds';

  readonly spawnPoint = new Vector3(gateX, floorY + 1.8, COURTYARD_INNER_FRONT_Z + 1.5);
  readonly spawnTarget = new Vector3(gateX, floorY + 3.7, GREAT_HALL_DOOR_Z);

  private terrainMeshes: AbstractMesh[] = [];
  private lake: BlackLake | null = null;
  private boatLight: PointLight | null = null;
  private castleMeshes: AbstractMesh[] = [];
  private collisionProxies: Mesh[] = [];
  private gateTriggerPosition = new Vector3(gateX, GREAT_HALL_FLOOR_Y + 1.6, GREAT_HALL_ENTRANCE_Z);
  private callbacks?: CastleGroundsZoneCallbacks;

  constructor(callbacks?: CastleGroundsZoneCallbacks) {
    this.callbacks = callbacks;
  }

  async load(scene: Scene, shadowGenerator?: ShadowGenerator | null): Promise<void> {
    this.createTerrain(scene);
    this.castleMeshes = CastleExterior.build(scene, shadowGenerator);
    this.boatLight = new PointLight('boathouse-lamp', place(BOATHOUSE, -0.45, 1.88, 1.4), scene);
    this.boatLight.diffuse = new Color3(1, 0.66, 0.26);
    this.boatLight.range = 6.3;
    this.boatLight.intensity = 5;
    this.boatLight.includedOnlyMeshes = this.castleMeshes.filter(mesh => mesh.name.startsWith('boathouse-'));
    this.lake = new BlackLake(scene, [
      ...this.castleMeshes,
      ...this.terrainMeshes.filter(mesh => mesh.name.startsWith('mountain_ridge_')),
    ]);

    this.createCollisionProxies(scene);
  }

  getCastleBounds(): { center: Vector3; radius: number; min: Vector3; max: Vector3; corners: Vector3[] } | null {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const corners: Vector3[] = [];

    for (const mesh of this.castleMeshes) {
      if (mesh.getTotalVertices() === 0) continue;
      mesh.computeWorldMatrix(true);
      const { minimumWorld, maximumWorld, vectorsWorld } = mesh.getBoundingInfo().boundingBox;
      min.minimizeInPlace(minimumWorld);
      max.maximizeInPlace(maximumWorld);
      corners.push(...vectorsWorld);
    }

    const radius = Vector3.Distance(min, max) / 2;
    if (!Number.isFinite(radius) || radius === 0) return null;
    return { center: Vector3.Center(min, max), radius, min, max, corners };
  }

  setTerrainVisible(visible: boolean): void {
    this.terrainMeshes.forEach((mesh) => mesh.setEnabled(visible));
    this.lake?.setVisible(visible);
  }

  setHallDoorsClosed(closed: boolean): void {
    for (const mesh of this.castleMeshes) {
      if (mesh.name.startsWith(HALL_DOOR_BATCH.open)) mesh.setEnabled(!closed);
      if (mesh.name.startsWith(HALL_DOOR_BATCH.closed)) mesh.setEnabled(closed);
    }
  }

  setLakeLighting(light: 'day' | 'night' | null): void {
    this.lake?.setDaylight(light === 'day');
    if (this.boatLight) this.boatLight.intensity = light === 'day' ? 3 : 7;
    const amber = this.castleMeshes.find(mesh => mesh.material?.name === 'castle-amber-glass')?.material;
    if (amber instanceof PBRMaterial) amber.emissiveIntensity = light === 'night' ? 5 : 1;
  }

  private createTerrain(scene: Scene): void {
    // Highland Grass Ground Plane
    const ground = MeshBuilder.CreateGround(
      'highlandGround',
      { width: 650, height: 650, subdivisions: 32 },
      scene,
    );
    ground.position.y = 0;

    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.08, 0.12, 0.08); // Dark moorland moss
    groundMat.specularColor = new Color3(0.02, 0.03, 0.02);
    ground.material = groundMat;
    ground.receiveShadows = true;
    ground.checkCollisions = true; // Ground itself is a primary collider
    this.terrainMeshes.push(ground);

    // Distant perimeter mountain ridges (Atmospheric backdrop)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const dist = 268 + (i % 2) * 25;
      const ridge = MeshBuilder.CreateCylinder(
        `mountain_ridge_${i}`,
        { diameterTop: 0, diameterBottom: 128 + (i % 3) * 30, height: 54 + (i % 2) * 30, tessellation: 8 },
        scene,
      );
      ridge.position = new Vector3(Math.cos(angle) * dist, 15, Math.sin(angle) * dist + 40);
      const ridgeMat = new StandardMaterial(`ridgeMat_${i}`, scene);
      ridgeMat.diffuseColor = new Color3(0.05, 0.06, 0.1);
      ridge.material = ridgeMat;
      ridge.checkCollisions = false;
      this.terrainMeshes.push(ridge);
    }
  }

  private createCollisionProxies(scene: Scene): void {
    const registerProxy = (mesh: Mesh) => {
      mesh.isVisible = false;
      mesh.checkCollisions = true;
      this.collisionProxies.push(mesh);
    };
    const proxy = (name: string, center: Vector3, width: number, height: number, depth: number, yaw = 0, pitch = 0) => {
      const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
      mesh.position.copyFrom(center);
      mesh.rotation.set(pitch, yaw, 0);
      registerProxy(mesh);
    };

    const { width, length, eave, openingWidth, wallDepth } = ENTRANCE_COURTYARD;
    const courtZ = courtyardFrontZ + length / 2;
    proxy('proxy_courtyard_floor', new Vector3(gateX, floorY - 0.75, courtZ), width + 0.35, 1.5, length);
    // Match the stair and viaduct openings in the outer arcades.
    for (const [side, openingZ] of [[-1, COURTYARD_SIDE_ENTRY_Z], [1, VIADUCT_ENTRY_Z]]) {
      const wallX = gateX + side * (width - wallDepth) / 2;
      const openingStart = openingZ - openingWidth / 2;
      const openingEnd = openingZ + openingWidth / 2;
      for (const [from, to] of [[courtyardFrontZ, openingStart], [openingEnd, COURTYARD_BACK_Z]]) {
        proxy('proxy_courtyard_side', new Vector3(wallX, floorY + eave / 2, (from + to) / 2), wallDepth, eave, to - from);
      }
    }
    proxy('proxy_viaduct_deck', place(VIADUCT, VIADUCT.length / 2, VIADUCT.deckY - 0.23),
      VIADUCT.length, 0.46, VIADUCT.width, VIADUCT.yaw);
    for (const points of [viaductApproach, viaductLanding]) {
      registerProxy(masonrySurface(scene, 'proxy_viaduct_platform', [{ points, outward: Vector3.Up() }]));
    }
    for (const rail of viaductRailings) {
      const center = rail.center.add(new Vector3(0, VIADUCT_RAIL.height / 2, 0));
      proxy('proxy_viaduct_rail', center, rail.length + 0.12, VIADUCT_RAIL.height, VIADUCT_RAIL.width, rail.yaw);
    }
    for (const points of [...quadWalkwayFloors, quadPortalFloor]) {
      registerProxy(masonrySurface(scene, 'proxy_quad_walkway_floor', [{ points, outward: Vector3.Up() }]));
    }
    registerProxy(masonrySurface(scene, 'proxy_quad_walkway_terrace',
      quadWalkwayTerrace.map(points => ({ points, outward: Vector3.Up() }))));
    for (const rail of quadWalkwayRails) {
      proxy('proxy_quad_walkway_rail', rail.center, rail.width, rail.height, rail.slopeLength + 0.15,
        rail.frame.yaw, rail.angle);
    }
    const quad = STAIRCASE_QUAD;
    const entry = QUAD_ENTRY;
    const halfWing = quad.wingWidth / 2;
    const courtSpan = quad.span - quad.wingWidth;
    const courtCenter = quad.span / 2;
    proxy('proxy_quad_floor', place(quad, courtCenter, entry.y - 0.25, courtCenter),
      entry.pavingWidth, 0.50, entry.pavingWidth, quad.yaw);
    for (const side of [-1, 1]) {
      const pierWidth = (courtSpan - entry.width) / 2;
      proxy('proxy_quad_entry_jamb', place(quad, courtCenter + side * (entry.width + pierWidth) / 2, entry.y + 3, halfWing),
        pierWidth, 6, entry.wallDepth, quad.yaw);
      proxy('proxy_quad_portal_side', place(quad, courtCenter + side * (entry.width / 2 + 0.13), entry.y + 3, 0),
        0.26, 6, quad.wingWidth, quad.yaw);
      proxy('proxy_quad_side', place(quad, courtCenter + side * courtSpan / 2, entry.y + 3, courtCenter),
        entry.wallDepth, 6, courtSpan, quad.yaw);
    }
    proxy('proxy_quad_back', place(quad, courtCenter, entry.y + 3, quad.span - halfWing),
      courtSpan, 6, entry.wallDepth, quad.yaw);
    const hospital = HOSPITAL_WING;
    const hospitalShoulder = hospital.courtEnd + 1.65;
    const hospitalBack = quad.span - halfWing;
    proxy('proxy_quad_hospital', place(quad, hospital.across, entry.y + 3, (hospitalShoulder + hospitalBack) / 2),
      hospital.width, 6, hospitalBack - hospitalShoulder, quad.yaw);
    proxy('proxy_quad_hospital_nose', place(quad, hospital.across, entry.y + 3, hospital.courtEnd + 0.825),
      hospital.width - 3, 6, 1.65, quad.yaw);

    const inner = COURTYARD_INNER_HALF_WIDTH;
    const innerLength = COURTYARD_INNER_BACK_Z - COURTYARD_INNER_FRONT_Z;
    proxy('proxy_courtyard_front', new Vector3(gateX, floorY + eave / 2, courtyardFrontZ + wallDepth / 2),
      width, eave, wallDepth);
    for (let i = 1; i < courtyardInnerFrontBays; i++) {
      const x = gateX - inner + i * 2 * inner / courtyardInnerFrontBays;
      proxy('proxy_arcade_pier', new Vector3(x, floorY + eave / 2, COURTYARD_INNER_FRONT_Z), 0.38, eave, wallDepth);
    }
    for (const side of [-1, 1]) {
      const returnWidth = (width - hallDoorLanding.width) / 2;
      proxy('proxy_courtyard_return', new Vector3(gateX + side * (hallDoorLanding.width + returnWidth) / 2,
        floorY + eave / 2, COURTYARD_BACK_Z - wallDepth / 2), returnWidth, eave, wallDepth);
      for (let i = 0; i <= courtyardInnerSideBays; i++) {
        const z = COURTYARD_INNER_FRONT_Z + i * innerLength / courtyardInnerSideBays;
        proxy('proxy_arcade_pier', new Vector3(gateX + side * inner, floorY + eave / 2, z), wallDepth, eave, 0.38);
      }
    }

    for (const part of hallVestibuleColliders) {
      proxy('proxy_hall_vestibule', new Vector3(gateX + part.x, GREAT_HALL_FLOOR_Y + part.y, GREAT_HALL_ENTRANCE_Z + part.z),
        part.width, part.height, part.depth);
    }
    proxy('proxy_hall_zone_boundary', new Vector3(gateX, GREAT_HALL_FLOOR_Y + 2, GREAT_HALL_ENTRANCE_Z + 0.55),
      GREAT_HALL.entryWidth, 4, 0.18);
    proxy('proxy_hall_vestibule_ramp', hallVestibuleSteps.center.add(new Vector3(gateX, GREAT_HALL_FLOOR_Y - 0.058, GREAT_HALL_ENTRANCE_Z)),
      hallVestibuleSteps.width, 0.12, hallVestibuleSteps.slopeLength, hallVestibuleSteps.frame.yaw, hallVestibuleSteps.angle);
    const landing = hallDoorLanding;
    proxy('proxy_hall_door_landing', landing.center, landing.width, landing.height, landing.length);
    const turret = COURTYARD_TURRET;
    const tower = MeshBuilder.CreateCylinder('proxy_courtyard_turret', {
      diameter: 2 * turret.radius, height: turret.eave - turret.base, tessellation: 24,
    }, scene);
    tower.position.set(turret.x, (turret.eave + turret.base) / 2, turret.z);
    registerProxy(tower);
    const drum = MeshBuilder.CreateCylinder('proxy_main_tower', {
      diameter: 2 * (MAIN_TOWER.radius + 0.19), height: MAIN_TOWER.roofBase - MAIN_TOWER.base, tessellation: 32,
    }, scene);
    drum.position.set(MAIN_TOWER.x, (MAIN_TOWER.base + MAIN_TOWER.roofBase) / 2, MAIN_TOWER.z);
    registerProxy(drum);
    for (const [corner, tower] of Object.entries(QUAD_TOWERS)) {
      const collider = MeshBuilder.CreateCylinder('proxy_quad_tower_' + corner, {
        diameter: 2 * tower.radius, height: tower.eave - tower.base, tessellation: 24,
      }, scene);
      collider.position.copyFrom(place(quad, tower.across, quad.floor + (tower.base + tower.eave) / 2, tower.depth));
      registerProxy(collider);
    }
    const linkWing = HALL_TOWER_LINK;
    proxy('proxy_hall_tower_link',
      new Vector3((linkWing.west + linkWing.east) / 2, (linkWing.floor + linkWing.eave) / 2, (linkWing.front + linkWing.back) / 2),
      linkWing.east - linkWing.west + 0.46, linkWing.eave - linkWing.floor, linkWing.back - linkWing.front + 0.46);

    for (const run of [hallDoorSteps, ...cliffStairRuns]) {
      proxy('proxy_stair_ramp', run.center.clone().addInPlaceFromFloats(0, -0.058, 0),
        run.width, 0.12, run.slopeLength, run.frame.yaw, run.angle);
    }
    for (const wall of cliffWallColliders) {
      proxy('proxy_cliff_parapet', wall.center, wall.width, wall.height, wall.length, wall.yaw, wall.pitch);
    }
    for (const { points } of cliffLandings) {
      registerProxy(masonrySurface(scene, 'proxy_cliff_landing', [{ points, outward: Vector3.Up() }]));
    }
    const link = cliffGateLink;
    proxy('proxy_cliff_gate_link', link.center, link.length, link.thickness, link.width);

    const boat = BOATHOUSE;
    for (const deck of boatDecks) {
      proxy('proxy_boathouse_quay', place(boat, deck.across, boat.deckY / 2, deck.depth),
        deck.width, boat.deckY, deck.length, boat.yaw);
    }
    for (const side of [-1, 1]) {
      proxy('proxy_boathouse_side_wall', place(boat, side * (boat.width - boat.wall) / 2, boat.deckY + boat.eave / 2, boat.length / 2),
        boat.wall, boat.eave, boat.length, boat.yaw);
      for (const [depth, opening] of [[0, boatPortal], [boat.length, boatRearDoor]] as const) {
        const jamb = (boat.width - opening.width) / 2;
        proxy('proxy_boathouse_jamb', place(boat, side * (opening.width + jamb) / 2, boat.eave / 2, depth),
          jamb, boat.eave, boat.wall, boat.yaw);
      }
    }

    proxy('proxy_barrier_n', new Vector3(0, 10, 70), 140, 20, 2);
    proxy('proxy_barrier_s', new Vector3(0, 10, -70), 140, 20, 2);
  }

  update(_playerPosition: Vector3): void {
    // Proximity logic or dynamic triggers can be updated here
  }

  getInteractionHint(playerPosition: Vector3): string | null {
    if (Vector3.Distance(playerPosition, this.gateTriggerPosition) <= 1.65) {
      return 'Press [E] to Enter Great Hall';
    }
    return null;
  }

  onInteract(action: string): void {
    console.info(`[CastleGroundsZone] Player interacted: ${action} at the Great Hall doors.`);
    if (this.callbacks?.onTransitionToZone) {
      this.callbacks.onTransitionToZone('great_hall');
    }
  }

  unload(): void {
    this.boatLight?.dispose();
    this.boatLight = null;
    this.lake?.dispose();
    this.lake = null;
    this.castleMeshes.forEach((mesh) => mesh.dispose());
    this.castleMeshes = [];

    this.terrainMeshes.forEach((mesh) => mesh.dispose(false, true));
    this.terrainMeshes = [];

    this.collisionProxies.forEach((proxy) => proxy.dispose());
    this.collisionProxies = [];
  }
}
