import { GREAT_HALL, WALL_DEPTH } from '../castleLayout';
import {
  archPanel, archTrim, archWall, gabledPortal, gableWall, lancetWindow, mouldedArch,
  pinnacle, pinnacledButtress,
} from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { normal, place, type Face, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, roofSpire } from './RoofParts';
import { stairRun, stoneStairs } from './StoneStairs';

const vestibuleWidth = GREAT_HALL.entryBayWidth - 0.96;
const innerDoorWidth = 3.1;
const innerDoorHeight = 3.72;
export const hallVestibuleSteps = stairRun(
  { x: 0, y: -GREAT_HALL.innerStairRise, z: -2.81 },
  { x: 0, y: 0, z: -0.40 },
  innerDoorWidth, 8,
);
export const hallVestibuleColliders = [
  { x: 0, y: -GREAT_HALL.innerStairRise - 0.12, z: -GREAT_HALL.entryBayDepth / 2,
    width: vestibuleWidth, height: 0.24, depth: GREAT_HALL.entryBayDepth },
  { x: 0, y: -0.11, z: 0, width: innerDoorWidth + 0.14, height: 0.22, depth: WALL_DEPTH },
  ...[-1, 1].flatMap(side => [
    { x: side * (GREAT_HALL.entryBayWidth / 2 - 0.24), y: 2.81, z: -2.28,
      width: 0.48, height: 8.5, depth: 4.9 },
    { x: side * (GREAT_HALL.width + innerDoorWidth) / 4, y: 3, z: 0,
      width: (GREAT_HALL.width - innerDoorWidth) / 2, height: 6, depth: WALL_DEPTH },
    { x: side * (innerDoorWidth + vestibuleWidth) / 4, y: -GREAT_HALL.innerStairRise / 2, z: -1.26,
      width: (vestibuleWidth - innerDoorWidth) / 2, height: GREAT_HALL.innerStairRise, depth: 1.72 },
    { x: side * (GREAT_HALL.entryWidth + GREAT_HALL.entryBayWidth) / 4, y: 2.1, z: -GREAT_HALL.entryBayDepth - 0.59,
      width: (GREAT_HALL.entryBayWidth - GREAT_HALL.entryWidth) / 2, height: 7.08, depth: 1.65 },
  ]),
];

/** The courtyard façade has a tall clock recess above a separate gabled doorway. */
export function greatHallFront<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, entrance: Frame, floor: number, exterior: boolean,
): void {
  const { width, eave, entryWidth, entryHeight, entryBayDepth, entryBayWidth, porchDepth } = GREAT_HALL;
  const entryFloor = floor - GREAT_HALL.innerStairRise;
  const paving = mat.entryPaving ?? mat.trim;
  const portal = { width: entryWidth, height: entryHeight, sill: entryFloor };
  const top = entryFloor + eave;
  const atDepth = (depth: number): Frame => {
    const point = place(entrance, 0, floor, depth);
    return { x: point.x, z: point.z, yaw: entrance.yaw };
  };

  const doorDepth = -entryBayDepth;
  const door = atDepth(doorDepth);
  const facade = (depth: number) => atDepth(doorDepth + depth);
  const innerPortal = { width: innerDoorWidth, height: innerDoorHeight, sill: floor, spring: 0.76 };
  archWall(mesh, mat.stone, entrance, width, floor, top, WALL_DEPTH, innerPortal);
  for (const side of [-1, 1]) archTrim(mesh, mat.trim, entrance, innerPortal, 0.115, WALL_DEPTH / 2 + 0.01, side);
  openDoorLeaves(mesh, mat, entrance, innerPortal.width, innerPortal.height, floor, WALL_DEPTH / 2);
  if (!exterior) greatHallOuterDoors(mesh, mat, entrance, floor, false);
  const stairBottom = place(entrance, 0, entryFloor, hallVestibuleSteps.frame.z);
  const stairTop = place(entrance, 0, floor, -WALL_DEPTH / 2);
  stoneStairs(mesh, paving, paving,
    stairRun(stairBottom, stairTop, hallVestibuleSteps.width, hallVestibuleSteps.steps));
  mesh.box(paving, place(entrance, 0, entryFloor - 0.12, doorDepth / 2),
    vestibuleWidth, 0.24, -doorDepth);
  mesh.box(paving, place(entrance, 0, floor - 0.11),
    innerDoorWidth + 0.14, 0.22, WALL_DEPTH);
  for (const side of [-1, 1]) {
    const shoulderWidth = (vestibuleWidth - innerDoorWidth) / 2;
    mesh.box(paving, place(entrance, side * (innerDoorWidth + shoulderWidth) / 2,
      (floor + entryFloor) / 2, -1.26), shoulderWidth, GREAT_HALL.innerStairRise, 1.72);
  }

  const gableDepth = -0.99;
  const bayFront = doorDepth + gableDepth;
  entryBayReturns(mesh, mat, entrance, entryFloor, bayFront);
  if (!exterior) {
    archWall(mesh, mat.trim, door, GREAT_HALL.entryBayWidth, entryFloor, top, 0.48, portal);
    archTrim(mesh, mat.trim, door, portal, 0.17, 0.26, 1);
    gableWall(mesh, mat.trim, facade(gableDepth), entryBayWidth, top, 5.06);
    pitchedRoof(mesh, mat.slate, mat.slate, atDepth((bayFront + 0.15) / 2),
      entryBayWidth, 0.15 - bayFront, top + 0.02, 5.06, 0.14);
    return;
  }

  const archStone = mat.portalTrim ?? mat.trim;
  const recess = { width: 4.68, height: 10.96, sill: entryFloor, spring: 0.74 };
  const rim = 0.78;
  archWall(mesh, mat.stone, facade(-0.76), entryBayWidth, entryFloor, top, 0.48,
    { ...recess, width: recess.width + 2 * rim, height: recess.height + rim });
  archWall(mesh, mat.clockRecess ?? mat.trim, facade(-0.249), recess.width + 0.75, entryFloor, top, 0.048, portal);
  mouldedArch(mesh, archStone, door, recess, [
    [0, -0.28], [0.085, -0.60], [0.17, -0.77], [0.255, -0.83], [0.32, -0.75],
    [0.41, -0.91], [0.49, -0.98], [0.55, -0.89], [0.64, -1.04], [0.70, -1.11], [rim, -0.995],
  ]);

  const upperHalf = entryBayWidth / 2;
  const upperRise = 5.06;
  gableWall(mesh, mat.stone, facade(gableDepth), upperHalf * 2, top, upperRise);
  pitchedRoof(mesh, mat.slate, mat.slate, atDepth((bayFront + 0.15) / 2),
    entryBayWidth, 0.15 - bayFront, top + 0.02, upperRise, 0.14);
  for (const side of [-1, 1]) {
    const coping = mesh.box(archStone, place(door, side * upperHalf / 2, top + upperRise / 2, gableDepth - 0.06),
      Math.hypot(upperHalf, upperRise) + 0.07, 0.16, 0.42, entrance.yaw);
    coping.rotation.z = -side * Math.atan2(upperRise, upperHalf);
    const pier = place(door, side * 3.5, entryFloor, -1.0);
    pinnacledButtress(mesh, mat.stone, mat.trim, { x: pier.x, z: pier.z, yaw: entrance.yaw },
      entryFloor, eave + 0.08, 1.02, 0.68, 2.71);
  }

  const turretBase = entryFloor + 14.82;
  roofSpire(mesh, { shaft: mat.stone, trim: mat.trim, slate: mat.slate, iron: mat.iron },
    facade(-1.23), turretBase, { radius: 0.61, shaft: 3.75, cap: 3.98 });
  const slit = { width: 0.18, height: 1.36, sill: turretBase + 1.31, spring: 0.79 };
  archPanel(mesh, mat.iron, facade(-1.79), slit);

  const doorRim = 0.39;
  const gable = { ...portal, width: entryWidth + 2 * doorRim, height: entryHeight + doorRim };
  gabledPortal(mesh, mat.stone, archStone, facade(-porchDepth + 0.21),
    gable, 2.63, entryFloor + 3.13, entryFloor + 6.32, 0.44);
  mouldedArch(mesh, archStone, door, portal, [
    [0, -0.27], [0.07, -0.72], [0.14, -1.21], [0.20, -1.46], [0.26, -1.36], [0.32, -1.53], [doorRim, -1.48],
  ]);
  pinnacle(mesh, mat.stone, mat.trim, facade(-porchDepth + 0.11), entryFloor + 6.3, 0.24, 0.65);
  clockDial(mesh, mat, door, entryFloor + 9.42);
}

export function greatHallOuterDoors<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, entrance: Frame, floor: number, closed: boolean,
): void {
  const { entryWidth: width, entryHeight: height, innerStairRise, entryBayDepth } = GREAT_HALL;
  const sill = floor - innerStairRise;
  const point = place(entrance, 0, sill, -entryBayDepth);
  const door = { x: point.x, z: point.z, yaw: entrance.yaw };
  if (!closed) {
    openDoorLeaves(mesh, mat, door, width, height, sill, 0.12);
    return;
  }

  // The panel sits behind the innermost moulding and fills its pointed profile.
  const panel = place(door, 0, sill, -0.25);
  archPanel(mesh, mat.door, { ...door, x: panel.x, z: panel.z }, { width: width + 0.08, height: height + 0.04, sill });
  mesh.box(mat.iron, place(door, 0, sill + (height - 0.08) / 2, -0.281),
    0.035, height - 0.08, 0.027, door.yaw);
  for (const side of [-1, 1]) {
    for (const y of [0.30, 1.43, 2.56]) {
      mesh.box(mat.iron, place(door, side * (width / 4 + 0.075), sill + y, -0.294),
        width / 2 - 0.33, 0.092, 0.05, door.yaw);
    }
    mesh.box(mat.door, place(door, side * 0.061, sill + (height - 0.12) / 2, -0.291),
      0.105, height - 0.12, 0.06, door.yaw);
    for (const x of [0.36, 0.72, 1.08, 1.44]) {
      mesh.box(mat.door, place(door, side * x, sill + height * 0.319, -0.276),
        0.032, height * 0.638, 0.035, door.yaw);
    }
    mesh.box(mat.iron, place(door, side * 0.18, sill + 1.29, -0.335), 0.096, 0.21, 0.09, door.yaw);
  }
}

function openDoorLeaves<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame,
  width: number, height: number, sill: number, inset: number,
): void {
  const leaf = width / 2 - 0.08;
  const jambHeight = height * 0.72;
  for (const side of [-1, 1]) {
    const hinge = place(frame, side * (width / 2 - 0.09), sill, inset);
    const opened = { x: hinge.x, z: hinge.z, yaw: frame.yaw + side * Math.PI / 2 };
    const at = (along: number, y: number, offset = 0) => place(opened, -side * along, sill + y, offset);
    mesh.box(mat.door, at(leaf / 2, jambHeight / 2), leaf, jambHeight, 0.13, opened.yaw);
    for (const face of [-1, 1]) {
      const profile = [at(0, jambHeight, face * 0.065), at(leaf, jambHeight, face * 0.065),
        at(leaf, height - 0.14, face * 0.065), at(leaf * 0.48, jambHeight + 0.53, face * 0.065)];
      mesh.surface(mat.door, [{ points: profile, outward: normal(opened.yaw, face) }]);
      for (const y of [0.26, 1.34, 2.43]) {
        mesh.box(mat.door, at(leaf / 2, y, face * 0.089), leaf, 0.12, 0.09, opened.yaw);
      }
      for (const edge of [0.12, leaf - 0.12]) {
        mesh.box(mat.door, at(edge, jambHeight / 2, face * 0.091), 0.12, jambHeight, 0.09, opened.yaw);
      }
      mesh.box(mat.iron, at(leaf - 0.2, 1.28, face * 0.11), 0.13, 0.19, 0.11, opened.yaw);
    }
  }
}

function entryBayReturns<M>(mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, floor: number, front: number): void {
  const { entryBayWidth, entryWidth, eave, threshold } = GREAT_HALL;
  const back = 0.18;
  const span = back - front;
  const center = (front + back) / 2;
  const depth = 0.48;
  const half = entryBayWidth / 2;
  const top = floor + eave;
  const clearLanding = entryWidth + 1.15;
  const plinthWidth = (entryBayWidth + 0.18 - clearLanding) / 2;
  for (const side of [-1, 1]) {
    const wall = place(frame, side * (half - depth / 2), floor, center);
    const bay = { x: wall.x, z: wall.z, yaw: frame.yaw - side * Math.PI / 2 };
    const window = { width: 1.16, height: 4.11, sill: floor + 2.01, spring: 0.76 };
    archWall(mesh, mat.stone, bay, span, floor, top, depth, window);
    lancetWindow(mesh, mat.portalTrim ?? mat.trim, mat.entryGlass ?? mat.iron, bay, window, depth,
      mat.entryGlass ? 3 : 1, mat.iron, false);
    for (const y of [1.29, 2.56]) {
      mesh.box(mat.trim, place(bay, 0, window.sill + y, -depth / 2 + 0.085),
        window.width, 0.092, 0.13, bay.yaw);
    }
    for (const y of [0.70, 6.62, eave - 0.19]) {
      mesh.box(mat.portalTrim ?? mat.trim, place(frame, side * half, floor + y, center),
        0.22, 0.13, span + 0.07, frame.yaw);
    }
    mesh.box(mat.stone, place(frame, side * (clearLanding + plinthWidth) / 2, floor - threshold / 2, center),
      plinthWidth, threshold, span);
  }
}

export function clockDial<M>(mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, centerY: number, radius = 1.04): void {
  const scale = radius / 1.04;
  const metal = mat.clockMetal ?? mat.trim;
  const outward = normal(frame.yaw);
  const steps = 48;
  const rim = (angle: number, size: number, depth: number) =>
    place(frame, Math.sin(angle) * size, centerY + Math.cos(angle) * size, depth);
  const face = (size: number, depth: number) => Array.from({ length: steps }, (_, i) => rim(i * 2 * Math.PI / steps, size, depth));

  mesh.surface(metal, [{ points: face(radius * 0.84, -0.661), outward }]);
  for (const [material, outerSize, outerDepth, innerSize, innerDepth] of [
    [mat.iron, 1.09, -0.284, 1.05, -0.6], [mat.trim, 1.05, -0.6, 1.01, -0.665],
    [metal, 1.01, -0.665, 0.91, -0.693], [mat.iron, 0.91, -0.693, 0.86, -0.692],
    [metal, 0.86, -0.692, 0.84, -0.661], [mat.trim, 0.64, -0.674, 0.618, -0.673],
  ] as const) {
    const outer = face(radius * outerSize, outerDepth);
    const inner = face(radius * innerSize, innerDepth);
    const band: Face[] = outer.map((point, i) => {
      const next = (i + 1) % steps;
      return { points: [point, outer[next], inner[next], inner[i]], outward };
    });
    mesh.surface(material, band);
  }

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const major = i % 3 === 0;
    const tick = mesh.box(mat.iron, rim(angle, radius * 0.735, -0.678),
      (major ? 0.07 : 0.038) * scale, (major ? 0.15 : 0.093) * scale, 0.023, frame.yaw);
    tick.rotation.z = -angle;
  }
  // The reference does not resolve a specific time.
  for (const [angle, length, width] of [[-0.96, 0.47, 0.07], [Math.PI / 3, 0.64, 0.045]]) {
    const hand = mesh.box(mat.iron, rim(angle, length * scale * 0.43, -0.706), width * scale, length * scale, 0.035, frame.yaw);
    hand.rotation.z = -angle;
  }
  mesh.surface(mat.iron, [{ points: face(0.082 * scale, -0.73), outward }]);
}
