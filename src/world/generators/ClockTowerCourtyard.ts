import { Vector3 } from '@babylonjs/core';
import { CLOCK_TOWER, CLOCK_TOWER_COURTYARD } from '../castleLayout';
import { courtyardTracery } from './EntranceCourtyard';
import { archTrim, archWall, gabledPortal, pinnacle } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { place, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, radialProfile } from './RoofParts';

const court = CLOCK_TOWER_COURTYARD;
const tower = CLOCK_TOWER;
const floor = tower.floor;
const half = court.width / 2;

function inCourt(across: number, depth: number, rotation = 0): Frame {
  const { x, z } = place(tower, across, 0, depth);
  return { x, z, yaw: tower.yaw + rotation };
}

function arcade<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, length: number, bays: number,
  blind = false, inner = false,
): void {
  const bayWidth = length / bays;
  for (let i = 0; i < bays; i++) {
    const point = place(frame, (i + 0.5) * bayWidth - length / 2, 0);
    const bay = { ...frame, x: point.x, z: point.z };
    const arch = { width: bayWidth - (inner ? 0.43 : 0.65), sill: floor + (inner ? 0 : 0.48),
      height: inner ? 2.72 : 2.08, spring: 0.69 };
    archWall(mesh, mat.stone, bay, bayWidth, floor, floor + court.eave, court.wall, arch);
    for (const side of [-1, 1]) {
      archTrim(mesh, mat.trim, bay, arch, 0.09, court.wall / 2 + 0.06, side);
    }
    if (blind) {
      mesh.box(mat.stone, place(bay, 0, floor + court.eave / 2, 0.07),
        bayWidth, court.eave, 0.20, frame.yaw);
    } else if (!inner) {
      courtyardTracery(mesh, mat.trim, bay, arch, court.wall);
    }
  }
  mesh.box(mat.trim, place(frame, 0, floor + court.eave + 0.02), length, 0.20, court.wall + 0.25, frame.yaw);
}

function cornerTurret<M>(mesh: Masonry<M>, mat: HallMaterials<M>, side: number): void {
  const frame = inCourt(side * (half - 0.12), court.end - 0.15);
  const radius = 1.49;
  const base = floor - (side > 0 ? 12.7 : 10.7);
  const eave = floor + 4.17;
  const top = eave + (side > 0 ? 5.15 : 4.52);
  const sides = 32;
  const turret = radialProfile(mesh, frame, sides);
  const footing = radius * 0.91;
  turret.band(mat.stone, [base - 0.48, footing], [base, footing]);
  mesh.surface(mat.stone, [
    { points: Array.from({ length: sides }, (_, i) => turret.point(turret.angle(i), base - 0.48, footing)),
      outward: Vector3.Down() },
    { points: Array.from({ length: sides }, (_, i) => turret.point(turret.angle(i), base, footing)),
      outward: Vector3.Up() },
  ]);
  turret.band(mat.stone, [base, radius * 0.84], [floor - 1.1, radius]);
  turret.band(mat.stone, [floor - 1.1, radius], [eave, radius]);
  turret.band(mat.trim, [eave - 0.14, radius], [eave + 0.09, radius + 0.15]);
  turret.band(mat.slate, [eave + 0.09, radius + 0.15], [eave + 1.05, radius * 0.81]);
  turret.band(mat.slate, [eave + 1.05, radius * 0.81], [top, 0.054]);
  turret.band(mat.iron, [top - 0.05, 0.094], [top + 0.67, 0.017]);
  for (const slit of [3, 12, 21, 29]) {
    const point = turret.point(turret.angle(slit), eave - 1.1, radius + 0.015);
    mesh.box(mat.iron, point, 0.115, 0.78, 0.06, frame.yaw + Math.PI / 2 - turret.angle(slit));
  }
}

/** Low octagonal basin and the surviving part of its weathered stone canopy. */
function ruinedFountain<M>(mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame): void {
  const basin = radialProfile(mesh, frame, 8, Math.PI / 8);
  const rim = floor + 0.63;
  basin.band(mat.stone, [floor, 2.34], [floor + 0.16, 2.37]);
  basin.band(mat.stone, [floor + 0.16, 2.21], [rim - 0.13, 2.21]);
  basin.band(mat.trim, [rim - 0.13, 2.21], [rim, 2.30]);
  basin.band(mat.trim, [rim, 2.30], [rim + 0.035, 1.98]);
  const tiles = [];
  for (let edge = 0; edge < 8; edge++) {
    const inside = basin.panel(edge, [floor + 0.055, 1.98], [rim + 0.035, 1.98]);
    tiles.push({ ...inside, outward: inside.outward.negate() });
    tiles.push({ points: [place(frame, 0, floor + 0.06),
      basin.point(basin.angle(edge), floor + 0.06, 1.98),
      basin.point(basin.angle((edge + 1) % 8), floor + 0.06, 1.98)], outward: Vector3.Up() });
  }
  mesh.surface(mat.trim, tiles);
  mesh.box(mat.stone, place(frame, 0, floor + 0.31), 2.28, 0.48, 2.05, frame.yaw);
  for (const [x, z, height] of [[-0.81, -0.67, 2.57], [0.81, -0.67, 2.57], [-0.81, 0.67, 1.58], [0.81, 0.67, 0.76]]) {
    mesh.box(mat.trim, place(frame, x, floor + 0.55 + height / 2, z), 0.30, height, 0.30, frame.yaw);
    mesh.box(mat.stone, place(frame, x, floor + 0.65, z), 0.43, 0.24, 0.43, frame.yaw);
  }
  const pediment = place(frame, 0, 0, -0.67);
  const face = { x: pediment.x, z: pediment.z, yaw: frame.yaw };
  const arch = { width: 1.37, sill: floor + 2.47, height: 0.76 };
  gabledPortal(mesh, mat.stone, mat.trim, face, arch, 0.99, floor + 3.15, floor + 3.70, 0.27);
  for (const x of [-0.86, 0.86]) {
    const p = place(face, x, 0);
    pinnacle(mesh, mat.stone, mat.trim, { ...face, x: p.x, z: p.z }, floor + 3.19, 0.24, 0.72);
  }
  mesh.box(mat.stone, place(frame, 0.94, floor + 0.21, 1.28), 0.56, 0.28, 0.37, frame.yaw + 0.31);
}

export function clockTowerCourtyard<M>(mesh: Masonry<M>, mat: HallMaterials<M>, paving: M, grass: M): void {
  const span = court.end - court.start;
  const center = (court.end + court.start) / 2;
  mesh.box(mat.stone, place(tower, 0, floor - 2.05, center), court.width + 0.68, 0.40, span, tower.yaw);
  mesh.box(mat.stone, place(tower, 0, floor - 0.96, center), court.width + 0.52, 1.78, span, tower.yaw);
  mesh.box(paving, place(tower, 0, floor - 0.06, center), court.width + 0.07, 0.12, span, tower.yaw);
  for (const side of [-1, 1]) {
    const sideWall = inCourt(side * half, center, -side * Math.PI / 2);
    arcade(mesh, mat, sideWall, span, 6, side < 0);
    const covered = span / 3;
    const coveredCenter = court.start + covered / 2;
    const innerWall = inCourt(side * (half - 2.03), coveredCenter, -side * Math.PI / 2);
    arcade(mesh, mat, innerWall, covered, 2, false, true);
    mesh.box(mat.trim, place(tower, side * (half - 1.0), floor + court.eave + 0.12, coveredCenter),
      2.68, 0.20, covered + 0.22, tower.yaw);
    const lawn = [[3.1, -5.7], [5.6, -6.2], [7.7, -5.7], [8.3, -3.0], [7.9, -0.9],
      [8.6, 2.2], [8.0, 5.5], [6.15, 6.1], [3.8, 5.6], [2.95, 3.9], [3.55, 1.1], [2.76, -2.6]];
    const points = lawn.map(([x, z]) => place(tower, side * x, floor + 0.026, center + z));
    const middle = place(tower, side * 5.5, floor + 0.026, center);
    mesh.surface(grass, points.map((point, i) => ({
      points: [middle, point, points[(i + 1) % points.length]], outward: Vector3.Up(),
    })));

    const sideLength = half - court.gateway / 2;
    const front = inCourt(side * (half + court.gateway / 2) / 2, court.end, Math.PI);
    arcade(mesh, mat, front, sideLength, 4);
    mesh.box(mat.trim, place(front, 0, floor + court.eave + 0.25), sideLength, 0.20, 0.76, front.yaw);
    cornerTurret(mesh, mat, side);
  }

  const gate = inCourt(0, court.end, Math.PI);
  const opening = { width: court.gateway - 0.42, sill: floor, height: 3.22 };
  gabledPortal(mesh, mat.stone, mat.trim, gate, opening, court.gateway / 2, floor + 3.44, floor + 4.9, 0.78);
  archTrim(mesh, mat.trim, gate, opening, 0.16, 0.42, -1);
  pitchedRoof(mesh, mat.slate, mat.trim, inCourt(0, court.end + 0.28), court.gateway + 0.1,
    1.35, floor + 3.44, 1.46, 0.06);
  const landingCenter = court.end + court.landing / 2;
  mesh.box(mat.stone, place(tower, 0, floor - 3.36, landingCenter),
    court.gateway + 0.82, 0.45, court.landing, tower.yaw);
  mesh.box(mat.stone, place(tower, 0, floor - 1.61, landingCenter),
    court.gateway + 0.6, 3.05, court.landing, tower.yaw);
  mesh.box(paving, place(tower, 0, floor - 0.053, landingCenter),
    court.gateway + 0.55, 0.106, court.landing, tower.yaw);
  ruinedFountain(mesh, mat, inCourt(0, center + 0.58));
}
