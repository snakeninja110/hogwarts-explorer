import { Vector3 } from '@babylonjs/core';
import { CLOCK_TOWER, CLOCK_TOWER_PLINTH } from '../castleLayout';
import { archPanel, archTrim, archWall, gableWall, lancetWindow, mouldedArch, type Arch } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { clockDial } from './GreatHallEntrance';
import { normal, place, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, roofSpire } from './RoofParts';

const tower = CLOCK_TOWER;
const floor = tower.floor;
const footing = CLOCK_TOWER_PLINTH.top;
const eave = floor + 22.9;
const rise = 10.8;
const wall = 0.72;
const clockBayWidth = 8.25;
const clockProjection = 1.5;
const clockFrontWall = 1.14;

function frameAt(across: number, depth: number, rotation = 0): Frame {
  const { x, z } = place(tower, across, 0, depth);
  return { x, z, yaw: tower.yaw + rotation };
}

function slit<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame,
  width: number, lower: number, upper: number, arch: Arch,
): void {
  archWall(mesh, mat.stone, frame, width, lower, upper, wall, arch);
  lancetWindow(mesh, mat.trim, mat.iron, frame, arch, wall);
}

function windowStack<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, width: number, base: number,
): void {
  const storeys = [-6.2, -1.1, 3.2, 7.65, 12.05, 16.5, 20.5, eave - floor];
  mesh.box(mat.stone, place(frame, 0, (base + floor + storeys[0]) / 2),
    width, floor + storeys[0] - base, wall, frame.yaw);
  for (let i = 1; i < storeys.length; i++) {
    const lower = floor + storeys[i - 1];
    const upper = floor + storeys[i];
    slit(mesh, mat, frame, width, lower, upper, {
      width: i < 3 ? 0.53 : 0.64, height: i < 3 ? 1.47 : 1.72, sill: lower + (upper - lower - 1.65) / 2,
    });
  }
}

function roundel<M>(mesh: Masonry<M>, trim: M, inset: M, frame: Frame, y: number, radius: number, band: number): void {
  const outward = normal(frame.yaw);
  const circle = (r: number, depth: number) => Array.from({ length: 48 }, (_, i) => {
    const angle = i * 2 * Math.PI / 48;
    return place(frame, r * Math.cos(angle), y + r * Math.sin(angle), depth);
  });
  const outer = circle(radius, -0.47);
  const inner = circle(radius - band, -0.51);
  mesh.surface(trim, outer.map((point, i) => {
    const next = (i + 1) % outer.length;
    return { points: [point, outer[next], inner[next], inner[i]], outward };
  }));
  mesh.surface(inset, [{ points: circle(radius - band, -0.46), outward }]);
}

/** The projecting cross gable carries the dial over the two recessed apertures. */
function clockFront<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const front = frameAt(0, tower.length + clockProjection, Math.PI);
  const stonework = mat.portalTrim ?? mat.trim;
  const shadow = mat.clockRecess ?? mat.iron;
  const metal = mat.clockMetal ?? mat.trim;
  const dialY = floor + 22.15;
  const portal = { width: 4.22, sill: floor, height: 11.78, spring: 0.80 };
  const gallery = { width: 3.62, sill: floor + 12.7, height: 5.7, spring: 0.70 };
  const depth = clockFrontWall;
  const shoulder = eave + 2.2;
  const peak = eave + rise;
  mesh.box(mat.stone, place(front, 0, (footing + floor) / 2), clockBayWidth, floor - footing, depth, front.yaw);
  archWall(mesh, mat.stone, front, clockBayWidth, floor, floor + 12.7, depth, portal);
  archWall(mesh, mat.stone, front, clockBayWidth, floor + 12.7, shoulder, depth, gallery);
  for (const arch of [portal, gallery]) {
    mouldedArch(mesh, stonework, front, arch, [[0, -0.56], [0.13, -0.67], [0.27, -0.69], [0.48, -0.62]]);
  }
  const back = frameAt(0, tower.length - 1.83, Math.PI);
  archPanel(mesh, shadow, back, { ...portal, width: 6.1, height: 18.55 });
  const doorY = floor + 2.8;
  mesh.box(mat.door, place(front, 0, doorY, 1.66), portal.width, 5.6, 0.2, front.yaw);
  for (let bar = -6; bar <= 6; bar++) {
    mesh.box(mat.iron, place(front, bar * 0.28, doorY, 1.49), 0.058, 5.6, 0.06, front.yaw);
  }
  for (const height of [1.35, 3.3, 5.5]) {
    mesh.box(mat.iron, place(front, 0, floor + height, 1.45), portal.width, 0.092, 0.07, front.yaw);
  }
  const pendulum = mesh.box(metal, place(front, 0, floor + 10.7, 0.96), 0.105, 11.4, 0.095, front.yaw);
  pendulum.rotation.z = -0.047;
  const bob = frameAt(-0.27, tower.length + clockProjection - 1.25, Math.PI);
  roundel(mesh, metal, mat.trim, bob, floor + 5.0, 0.79, 0.09);
  for (const side of [-1, 1]) {
    mesh.box(mat.stone, place(front, side * (clockBayWidth - wall) / 2, (footing + shoulder) / 2, clockProjection / 2),
      wall, shoulder - footing, clockProjection + 0.36, front.yaw);
    mesh.box(stonework, place(front, side * 3.19, floor + 10.6, -0.61), 0.33, 21.2, 0.33, front.yaw);
    mesh.box(stonework, place(front, side * 3.19, floor + 0.38, -0.62), 0.58, 0.75, 0.7, front.yaw);
  }
  const gableFace = frameAt(0, tower.length + clockProjection + depth / 2, Math.PI);
  gableWall(mesh, mat.stone, gableFace, clockBayWidth, shoulder, peak - shoulder);
  const ornament = frameAt(0, tower.length + clockProjection + 0.19, Math.PI);
  roundel(mesh, stonework, shadow, ornament, dialY, 2.31, 0.27);
  roundel(mesh, stonework, shadow, gableFace, floor + 25.05, 0.79, 0.19);
  const dial = frameAt(0, tower.length + clockProjection + 0.16, Math.PI);
  clockDial(mesh, mat, dial, dialY, 1.86);
  const upperSlit = { width: 0.28, height: 2.25, sill: floor + 27.1 };
  archPanel(mesh, mat.iron, gableFace, upperSlit);
  archTrim(mesh, mat.trim, gableFace, upperSlit, 0.08, 0.065, -1);

  // Run the cross gable into the main slate slope along its two valleys.
  const tip = tower.length + clockProjection + depth / 2 + 0.15;
  const join = tower.length - tower.length / 2 * ((shoulder - eave) / rise);
  for (const side of [-1, 1]) {
    const half = side * (clockBayWidth / 2 + 0.18);
    const face = [place(tower, half, shoulder, tip), place(tower, half, shoulder, join - 0.12),
      place(tower, 0, peak + 0.1, tower.length / 2 - 0.12), place(tower, 0, peak + 0.1, tip)];
    mesh.surface(mat.slate, [{ points: face, outward: Vector3.Up() }, { points: face, outward: Vector3.Down() }]);
    const coping = mesh.box(stonework, place(tower, half / 2, (shoulder + peak) / 2, tip + 0.015),
      Math.hypot(half, peak - shoulder), 0.22, 0.37, tower.yaw);
    coping.rotation.z = -Math.atan2(peak - shoulder, half) + (side < 0 ? Math.PI : 0);
  }
  roofSpire(mesh, { ...mat, shaft: mat.stone }, frameAt(0, tip - 0.35),
    peak - 0.7, { radius: 0.62, shaft: 2.65, cap: 5.8 });
}

function roofDormers<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const halfDepth = tower.length / 2;
  for (const side of [-1, 1]) {
    for (const [row, fraction] of [0.17, 0.42, 0.72].entries()) {
      const y = eave + rise * fraction;
      const depth = halfDepth + side * halfDepth * (1 - fraction);
      for (let i = -6; i <= 6; i++) {
        const across = (i + (row % 2) * 0.5) * 1.83;
        if (side === 1 && Math.abs(across) < (row === 2 ? 1.85 : 4.7)) continue;
        if (side === -1 && row === 0 && Math.abs(across) < 2.4) continue;
        const face = frameAt(across, depth + side * 0.21, side === 1 ? Math.PI : 0);
        const top = y + 0.53;
        const opening = { width: 0.29, height: 0.47, sill: y - 0.09 };
        archWall(mesh, mat.stone, face, 0.68, y - 0.19, top, 0.27, opening);
        lancetWindow(mesh, mat.trim, mat.iron, face, opening, 0.27);
        gableWall(mesh, mat.stone, face, 0.68, top, 0.44);
        pitchedRoof(mesh, mat.slate, mat.slate, frameAt(across, depth - side * 0.26),
          0.68, 1.12, top, 0.44, 0.05);
      }
    }
  }
}

function sideAnnex<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const across = 8.2;
  const depth = tower.length + 1.9;
  const frame = frameAt(across, depth, Math.PI);
  const width = 4.1;
  const top = floor + 9.95;
  for (const side of [-1, 1]) {
    for (const [base, cap, sill] of [[floor, floor + 5.0, floor + 1.9], [floor + 5, top, floor + 6.65]]) {
      const { x, z } = place(frame, side * width / 4, 0);
      slit(mesh, mat, { ...frame, x, z }, width / 2, base, cap, { width: 0.53, height: 1.65, sill });
    }
    const edge = frameAt(across + side * (width - wall) / 2, depth - 1.05);
    mesh.box(mat.stone, place(edge, 0, (floor + top) / 2), wall, top - floor, 2.46, edge.yaw);
  }
  gableWall(mesh, mat.stone, frame, width, top, 4.55);
  pitchedRoof(mesh, mat.slate, mat.trim, frameAt(across, depth - 1.11), width, 2.52, top, 4.55, 0.13);
}

export function clockTower<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { width, length } = tower;
  const half = width / 2;
  const wingBay = (width - clockBayWidth) / 6;
  // The masonry shell and its projecting bay bear on the same level stone course.
  const { thickness: plinth, overhang } = CLOCK_TOWER_PLINTH;
  const shoulder = length + overhang;
  const nose = length + clockProjection + clockFrontWall / 2 + 0.16;
  mesh.box(mat.stone, place(tower, 0, footing - plinth / 2, length / 2),
    width + 2 * overhang, plinth, length + 2 * overhang, tower.yaw);
  mesh.box(mat.stone, place(tower, 0, footing - plinth / 2, (nose + shoulder) / 2),
    clockBayWidth + 0.32, plinth, nose - shoulder, tower.yaw);
  mesh.box(mat.stone, place(tower, 0, (footing + eave) / 2), clockBayWidth, eave - footing, wall, tower.yaw);
  for (const side of [-1, 1]) {
    const edge = frameAt(side * half, length / 2, Math.PI / 2);
    const sideBays = 6;
    for (let bay = 0; bay < sideBays; bay++) {
      windowStack(mesh, mat, frameAt(side * half, length * (bay + 0.5) / sideBays, Math.PI / 2),
        length / sideBays, footing);
    }
    gableWall(mesh, mat.stone, edge, length, eave - 0.05, rise + 0.36);
    const face = frameAt(side * (half + 0.019), length / 2, side * -Math.PI / 2);
    for (const [x, height, sill] of [[0, 2.58, 3.0], [-2.65, 1.53, 1.1], [2.65, 1.53, 1.1]]) {
      const p = place(face, x, 0);
      const opening = { width: 0.66, height, sill: eave + sill };
      archPanel(mesh, mat.iron, { ...face, x: p.x, z: p.z }, opening);
      archTrim(mesh, mat.trim, { ...face, x: p.x, z: p.z }, opening, 0.11, 0.07, -1);
    }
    for (const end of [-1, 1]) {
      const steps = 10;
      const run = length / (2 * steps);
      const stepRise = rise / steps;
      for (let step = 0; step < steps; step++) {
        mesh.box(mat.trim, place(edge, end * (length / 2 - (step + 0.5) * run),
          eave + (step + 0.62) * stepRise + 0.15), run + 0.02, stepRise + 0.42, 0.63, edge.yaw);
      }
    }
    for (let bay = 0; bay < 3; bay++) {
      const x = side * (clockBayWidth / 2 + (bay + 0.5) * wingBay);
      windowStack(mesh, mat, frameAt(x, 0), wingBay, footing);
      windowStack(mesh, mat, frameAt(x, length, Math.PI), wingBay, footing);
    }
  }
  for (const end of [0, length]) {
    const face = frameAt(0, end);
    mesh.box(mat.trim, place(face, 0, eave - 0.14), width + 0.48, 0.28, 1.03, face.yaw);
    for (let i = -13; i <= 13; i++) {
      if (end === length && Math.abs(i) <= 4) continue;
      mesh.box(mat.trim, place(face, i * 0.91, eave - 0.52, end === 0 ? -0.41 : 0.41), 0.26, 0.72, 0.43, face.yaw);
    }
  }
  pitchedRoof(mesh, mat.slate, mat.slate, frameAt(0, length / 2, Math.PI / 2),
    length, width - 0.35, eave, rise, 0.18);
  roofDormers(mesh, mat);
  roofSpire(mesh, { ...mat, shaft: mat.stone }, frameAt(0.82, length / 2),
    eave + rise - 0.82, { radius: 0.82, shaft: 4.6, cap: 7.05 });
  clockFront(mesh, mat);
  sideAnnex(mesh, mat);
}
