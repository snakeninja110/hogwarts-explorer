import { Vector3 } from '@babylonjs/core';
import { BOATHOUSE } from '../castleLayout';
import { archPanel, archTrim, archWall, gableWall, gabledPortal, mouldedArch } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { place, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, radialProfile } from './RoofParts';

const { width, length, deckY, eave, roofRise, channel, rearLanding, wall } = BOATHOUSE;
const base = 0.06;
const eaveY = deckY + eave;
const ridgeY = eaveY + roofRise;
export const boatPortal = { width: channel, height: 4.47, sill: base, spring: 0.59 };
export const boatRearDoor = { width: 1.54, height: 2.22, sill: deckY };

export const boatDecks = [
  ...[-1, 1].map(side => ({
    across: side * (width + channel) / 4, depth: (length - 0.38) / 2,
    width: (width - channel) / 2, length: length + 0.38,
  })),
  { across: 2.27, depth: -0.72, width: 1.86, length: 1.2 },
  { across: 0, depth: length + (rearLanding - 1.15) / 2, width: 3.58, length: rearLanding + 1.15 },
];

function section(across: number, depth: number, rotation = 0): Frame {
  const { x, z } = place(BOATHOUSE, across, 0, depth);
  return { x, z, yaw: BOATHOUSE.yaw + rotation };
}

/** The lake gable carries the turret; the short nave and rear stair door sit behind it. */
export function boathouse<M>(mesh: Masonry<M>, mat: HallMaterials<M> & { tower: M }): void {
  const { stone, trim, slate, glass, iron, door } = mat;
  for (const deck of boatDecks) {
    mesh.box(stone, place(BOATHOUSE, deck.across, deckY / 2 - 0.17, deck.depth),
      deck.width, deckY + 0.34, deck.length, BOATHOUSE.yaw);
    mesh.box(trim, place(BOATHOUSE, deck.across, deckY - 0.065, deck.depth),
      deck.width, 0.13, deck.length, BOATHOUSE.yaw);
  }

  gabledPortal(mesh, stone, stone, BOATHOUSE, boatPortal, width / 2, eaveY, ridgeY, wall);
  mouldedArch(mesh, stone, BOATHOUSE, boatPortal, [[0, -wall / 2], [0.065, -wall / 2 - 0.048], [0.17, -wall / 2 - 0.026]]);
  const rear = section(0, length);
  archWall(mesh, stone, rear, width, base, eaveY, wall, boatRearDoor);
  archTrim(mesh, stone, rear, boatRearDoor, 0.12, wall / 2 + 0.025, 1);
  gableWall(mesh, stone, rear, width, eaveY, roofRise);
  pitchedRoof(mesh, slate, slate, section(0, length / 2 + 0.03),
    width, length - 0.06, eaveY + 0.03, roofRise, 0.22);

  for (const side of [-1, 1]) {
    mesh.box(stone, place(BOATHOUSE, side * (width - wall) / 2, (base + eaveY) / 2, length / 2),
      wall, eaveY - base, length, BOATHOUSE.yaw);
    mesh.box(stone, place(BOATHOUSE, side * (width / 2 - 0.055), 0.49, length / 2),
      0.23, 0.78, length, BOATHOUSE.yaw);
    const jamb = side * boatPortal.width / 2;
    mesh.box(stone, place(BOATHOUSE, jamb + side * 0.078, boatPortal.height * boatPortal.spring / 2 + base, -wall / 2 - 0.022),
      0.156, boatPortal.height * boatPortal.spring, 0.082, BOATHOUSE.yaw);
  }

  // Timbers remain visible through the water gate. The lamp sits low beside the arch.
  for (const depth of [0.85, length * 0.5, length - 0.66]) {
    mesh.box(door, place(BOATHOUSE, 0, eaveY - 0.18, depth), width - wall, 0.17, 0.16, BOATHOUSE.yaw);
  }
  const lamp = (across: number, y: number, depth: number) => {
    mesh.box(glass, place(BOATHOUSE, across, y, depth), 0.18, 0.34, 0.17, BOATHOUSE.yaw);
    for (const sign of [-1, 1]) {
      mesh.box(iron, place(BOATHOUSE, across, y + sign * 0.19, depth), 0.23, 0.06, 0.21, BOATHOUSE.yaw);
    }
  };
  lamp(1.43, deckY + 0.36, -wall / 2 - 0.11);
  lamp(-1.38, 2.63, 1.06);
  boatTurret(mesh, mat);
}

function boatTurret<M>(mesh: Masonry<M>, mat: HallMaterials<M> & { tower: M }): void {
  const { tower, glass, iron, slate } = mat;
  const depth = 0.87;
  const radius = 1.52;
  const spring = ridgeY - 0.52;
  const eave = ridgeY + 2.75;
  const tip = eave + 5.64;
  const { band } = radialProfile(mesh, section(0, depth), 8, Math.PI / 8);

  band(tower, [eaveY + 1.0, 0.55], [spring, radius]);
  const apothem = radius * Math.cos(Math.PI / 8);
  const faceWidth = 2 * radius * Math.sin(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const face = section(Math.cos(a) * (apothem - 0.08), depth + Math.sin(a) * (apothem - 0.08), Math.PI / 2 - a);
    const arch = { width: 0.46, height: 1.22, sill: eave - 1.78, spring: 0.63 };
    archWall(mesh, tower, face, faceWidth + 0.012, spring, eave - 0.24, 0.16, arch);
    archTrim(mesh, tower, face, arch, 0.09, 0.105, 1);
    const pane = section(Math.cos(a) * (apothem - 0.15), depth + Math.sin(a) * (apothem - 0.15), Math.PI / 2 - a);
    archPanel(mesh, i === 6 || i === 7 ? glass : iron, pane, arch);
    for (const h of [0.21, 0.46, 0.7]) {
      mesh.box(iron, place(face, 0, arch.sill + h, 0.049), arch.width - 0.05, 0.042, 0.052, face.yaw);
    }
    mesh.box(tower, place(face, 0, arch.sill - 0.055, 0.095), 0.62, 0.1, 0.21, face.yaw);
  }
  band(tower, [eave - 0.25, radius], [eave - 0.08, radius * 1.07]);
  band(slate, [eave - 0.09, radius * 1.08], [eave, radius * 1.18]);
  band(slate, [eave, radius * 1.18], [eave + 0.72, radius * 0.96]);
  band(slate, [eave + 0.72, radius * 0.96], [tip - 1.18, radius * 0.22]);
  band(slate, [tip - 1.18, radius * 0.22], [tip, 0.025]);

  // One steep lucarne interrupts the front quarter of the spire.
  const turn = 7 * Math.PI / 8;
  const lucarne = section(1.22 * Math.sin(turn), depth + 1.22 * Math.cos(turn), turn);
  const sill = eave + 0.69;
  mesh.box(tower, place(lucarne, 0, sill + 0.46, -0.13), 0.42, 0.92, 0.59, lucarne.yaw);
  const pane = place(lucarne, 0, 0, 0.185);
  archPanel(mesh, iron, { x: pane.x, z: pane.z, yaw: lucarne.yaw },
    { width: 0.19, height: 0.69, sill: sill + 0.13 });
  gableWall(mesh, tower, { x: pane.x, z: pane.z, yaw: lucarne.yaw }, 0.43, sill + 0.87, 0.45);
  pitchedRoof(mesh, slate, slate, lucarne, 0.43, 0.39, sill + 0.87, 0.46, 0.035);
  mesh.box(iron, place(BOATHOUSE, 0, tip + 0.19, depth), 0.058, 0.52, 0.058, BOATHOUSE.yaw);
  mesh.box(iron, place(BOATHOUSE, 0, tip + 0.36, depth), 0.21, 0.047, 0.085, BOATHOUSE.yaw);
}

export function boathouseShore<M>(mesh: Masonry<M>, rock: M): void {
  const outcrops = [
    [-3.9, 0.7, 2.0, 2.7, 1.26], [-4.3, 4.1, 1.85, 2.8, 1.12], [-3.95, 7.1, 2.02, 2.51, 1.4],
    [3.96, -0.14, 1.22, 1.8, 0.66], [4.2, 2.23, 1.72, 2.4, 1.12], [3.91, 5.7, 1.48, 2.64, 1.34],
    [2.7, 8.96, 1.24, 1.96, 1.07], [-2.98, 9.56, 1.24, 1.76, 0.91],
  ];
  for (const [index, [x, z, rx, rz, height]] of outcrops.entries()) {
    const facets = 8;
    const rings = [0, 1].map(level => Array.from({ length: facets }, (_, i) => {
      const a = 2 * Math.PI * i / facets;
      const ripple = Math.sin(index * 3.1 + i * 3.8 + level);
      const r = (level ? 0.72 : 1) * (1 + 0.18 * ripple);
      return place(BOATHOUSE, x + r * rx * Math.cos(a), level ? height * (0.61 + 0.24 * ripple) : -0.13,
        z + r * rz * Math.sin(a));
    }));
    const peak = place(BOATHOUSE, x - 0.11, height, z + 0.19);
    const bottom = place(BOATHOUSE, x, -0.13, z);
    const down = Vector3.Down();
    for (let i = 0; i < facets; i++) {
      const j = (i + 1) % facets;
      const [a, b, c, d] = [rings[0][i], rings[0][j], rings[1][j], rings[1][i]];
      const outward = Vector3.Center(a, b).subtract(bottom);
      mesh.surface(rock, [
        { points: [a, b, c], outward },
        { points: [a, c, d], outward },
        { points: [d, c, peak], outward: Vector3.Up() },
        { points: [bottom, a, b], outward: down },
      ]);
    }
  }
}
