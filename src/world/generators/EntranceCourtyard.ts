import { Vector3 } from '@babylonjs/core';
import {
  CASTLE_APPROACH,
  COURTYARD_BACK_Z, COURTYARD_INNER_BACK_Z, COURTYARD_INNER_FRONT_Z, COURTYARD_INNER_HALF_WIDTH,
  ENTRANCE_COURTYARD, GREAT_HALL, GREAT_HALL_DOOR_Z,
} from '../castleLayout';
import { archTrim, archWall } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { normal, place, type Face, type Frame, type Masonry } from './Masonry';
import { stairRun, stoneStairs } from './StoneStairs';

const { x, floorY, courtyardFrontZ } = CASTLE_APPROACH;
const { width, length, bays, frontBays, eave, sideEntryBay, viaductEntryBay, openingWidth, wallDepth } = ENTRANCE_COURTYARD;

const porchZ = GREAT_HALL_DOOR_Z - GREAT_HALL.porchDepth;
export const hallDoorLanding = {
  center: new Vector3(x, floorY + GREAT_HALL.threshold / 2, porchZ + GREAT_HALL.porchDepth / 2),
  width: GREAT_HALL.entryLandingWidth,
  height: GREAT_HALL.threshold,
  length: GREAT_HALL.porchDepth,
};
export const hallDoorSteps = stairRun(
  { x, y: floorY, z: porchZ - GREAT_HALL.entrySteps * GREAT_HALL.stepDepth },
  { x, y: floorY + GREAT_HALL.threshold, z: porchZ },
  GREAT_HALL.entryLandingWidth, GREAT_HALL.entrySteps,
);

export const courtyardInnerSideBays = 7;
export const courtyardInnerFrontBays = 5;

/** A low roofed arcade encloses the court and returns to the projecting entry. */
export function entranceCourtyard<M>(mesh: Masonry<M>, mat: HallMaterials<M>, paving: M, roofStone: M): void {
  const at = (across: number, y: number, z: number) => new Vector3(x + across, floorY + y, z);
  const outer = width / 2;
  const inner = COURTYARD_INNER_HALF_WIDTH;
  const innerFront = COURTYARD_INNER_FRONT_Z;
  const innerBack = COURTYARD_INNER_BACK_Z;
  const rim = wallDepth / 2;
  const entryHalf = hallDoorLanding.width / 2;
  const centerZ = courtyardFrontZ + length / 2;
  const stone = mat.trim;

  mesh.box(mat.stone, at(0, -1.135, centerZ), width + 0.35, 2.13, length);
  mesh.box(stone, at(0, -0.28, centerZ), width + 0.55, 0.21, length + 0.06);
  mesh.box(paving, at(0, -0.035, centerZ), width - 0.025, 0.07, length);
  for (const side of [-1, 1]) {
    mesh.box(stone, at(side * (inner - 0.18), 0.006, (innerFront + innerBack) / 2),
      0.18, 0.018, innerBack - innerFront);
  }

  function arcade(frame: Frame, span: number, opening: number, passage = false, innerFace = false): void {
    const arch = { width: opening, height: passage || innerFace ? 2.54 : 1.96,
      sill: floorY + (passage || innerFace ? 0 : 0.51) };
    archWall(mesh, mat.stone, frame, span, floorY, floorY + eave, wallDepth, arch);
    for (const side of [-1, 1]) archTrim(mesh, stone, frame, arch, 0.07, rim + 0.033, side);
    if (!passage && !innerFace) courtyardTracery(mesh, stone, frame, arch, wallDepth);
  }

  function roof(points: Vector3[]): void {
    mesh.surface(roofStone, [{ points, outward: Vector3.Up() }, { points, outward: Vector3.Down() }]);
  }

  const bay = length / bays;
  const innerBay = (innerBack - innerFront) / courtyardInnerSideBays;
  for (const side of [-1, 1]) {
    const yaw = -side * Math.PI / 2;
    for (let i = 0; i < bays; i++) {
      const z = courtyardFrontZ + (i + 0.5) * bay;
      const entry = i === (side === -1 ? sideEntryBay : viaductEntryBay);
      arcade({ x: x + side * (outer - rim), z, yaw }, bay, openingWidth, entry);
    }
    for (let i = 0; i < courtyardInnerSideBays; i++) {
      const z = innerFront + (i + 0.5) * innerBay;
      arcade({ x: x + side * inner, z, yaw: yaw + Math.PI }, innerBay, innerBay - 0.38, false, true);
    }

    roof([
      at(side * (outer + 0.08), eave, courtyardFrontZ),
      at(side * (inner - rim), eave, innerFront),
      at(side * (inner - rim), eave, innerBack),
      at(side * (outer + 0.08), eave, COURTYARD_BACK_Z),
    ]);
    mesh.box(stone, at(side * (outer - 0.15), eave + 0.045, centerZ), 0.55, 0.16, length);
    mesh.box(stone, at(side * inner, eave + 0.045, (innerFront + innerBack) / 2),
      0.56, 0.16, innerBack - innerFront);

    const outerReturn = outer - entryHalf;
    const innerReturn = inner - entryHalf;
    arcade({ x: x + side * (entryHalf + outerReturn / 2), z: COURTYARD_BACK_Z - rim, yaw: Math.PI },
      outerReturn, 1.55);
    arcade({ x: x + side * (entryHalf + innerReturn / 2), z: innerBack, yaw: 0 },
      innerReturn, innerReturn - 0.34, false, true);
    roof([
      at(side * entryHalf, eave, COURTYARD_BACK_Z),
      at(side * (outer + 0.08), eave, COURTYARD_BACK_Z),
      at(side * (inner - rim), eave, innerBack),
      at(side * entryHalf, eave, innerBack),
    ]);
    mesh.box(stone, at(side * (entryHalf + outerReturn / 2), eave + 0.045, COURTYARD_BACK_Z - 0.15),
      outerReturn, 0.16, 0.55);
    mesh.box(stone, at(side * (entryHalf + innerReturn / 2), eave + 0.045, innerBack),
      innerReturn, 0.16, 0.56);
  }

  const frontBay = width / frontBays;
  for (let i = 0; i < frontBays; i++) {
    arcade({ x: x - outer + (i + 0.5) * frontBay, z: courtyardFrontZ + rim, yaw: 0 },
      frontBay, frontBay - 0.52);
  }
  const innerFrontBay = 2 * inner / courtyardInnerFrontBays;
  for (let i = 0; i < courtyardInnerFrontBays; i++) {
    arcade({ x: x - inner + (i + 0.5) * innerFrontBay, z: innerFront, yaw: Math.PI },
      innerFrontBay, innerFrontBay - 0.38, false, true);
  }
  roof([
    at(-outer - 0.08, eave, courtyardFrontZ), at(outer + 0.08, eave, courtyardFrontZ),
    at(inner - rim, eave, innerFront), at(-inner + rim, eave, innerFront),
  ]);
  mesh.box(stone, at(0, eave + 0.045, courtyardFrontZ + 0.15), width + 0.18, 0.16, 0.55);
  mesh.box(stone, at(0, eave + 0.045, innerFront), 2 * inner + 0.56, 0.16, 0.56);

  const landing = hallDoorLanding;
  const stepStone = mat.entryPaving ?? stone;
  mesh.box(stepStone, landing.center, landing.width, landing.height, landing.length);
  stoneStairs(mesh, stepStone, stepStone, hallDoorSteps);
}

export function courtyardTracery<M>(
  mesh: Masonry<M>, trim: M, frame: Frame, { width, height, sill }: { width: number; height: number; sill: number }, depth: number,
): void {
  for (const side of [-1, 1]) {
    const p = place(frame, side * width * 0.221, sill);
    const light = { x: p.x, z: p.z, yaw: frame.yaw };
    const lancet = { width: width * 0.405, height: height * 0.77, sill, spring: 0.67 };
    archTrim(mesh, trim, light, lancet, 0.057, 0.082, 1);
    archTrim(mesh, trim, light, lancet, 0.057, 0.082, -1);
    const jamb = place(frame, side * (width / 2 + 0.11), sill + height / 2 - 0.04, -depth / 2 - 0.035);
    mesh.box(trim, jamb, 0.1, height + 0.28, 0.11, frame.yaw);
  }
  mesh.box(trim, place(frame, 0, sill - 0.056, -depth / 2 - 0.034), width + 0.32, 0.12, 0.18, frame.yaw);
  mesh.box(trim, place(frame, 0, sill + height + 0.141, -depth / 2 - 0.036), width + 0.33, 0.12, 0.14, frame.yaw);

  const ribs: Face[] = [];
  const points = 24;
  const foil = (i: number, side: number, inset: number) => {
    const a = i * Math.PI * 2 / points;
    const radius = width * (0.164 + 0.041 * Math.cos(a * 4)) - inset;
    return place(frame, radius * Math.cos(a), sill + height * 0.771 + radius * Math.sin(a), side * 0.083);
  };
  for (const side of [-1, 1]) {
    for (let i = 0; i < points; i++) {
      ribs.push({ points: [foil(i, side, 0), foil(i + 1, side, 0),
        foil(i + 1, side, 0.043), foil(i, side, 0.043)], outward: normal(frame.yaw, side) });
    }
  }
  mesh.surface(trim, ribs);
}
