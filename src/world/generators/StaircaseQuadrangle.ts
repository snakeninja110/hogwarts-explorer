import { Vector3 } from '@babylonjs/core';
import { HOSPITAL_WING, QUAD_ENTRY, QUAD_TOWERS, QUAD_WING_PLINTH, STAIRCASE_QUAD } from '../castleLayout';
import { archTrim, archWall, buttress, gableWall, lancetWindow } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { place, type Face, type Frame, type Masonry } from './Masonry';
import { pitchedRoof } from './RoofParts';

type PlanPoint = readonly [number, number];

const quad = STAIRCASE_QUAD;
const eave = quad.floor + 15.0;
const rise = 7.0;
const courtFloor = QUAD_ENTRY.y - 0.10;
const wallDepth = QUAD_ENTRY.wallDepth;
const halfWing = quad.wingWidth / 2;
const up = Vector3.Up();

function corners(inset: number): PlanPoint[] {
  const far = quad.span - inset;
  return [[inset, inset], [far, inset], [far, far], [inset, far]];
}

function edge(frame: Frame, a: PlanPoint, b: PlanPoint): Frame {
  const p = place(frame, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
  return { x: p.x, z: p.z, yaw: frame.yaw - Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

function windowBay<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, width: number,
  bottom: number, top: number, sill: number, height: number, opening: number, lights = 1,
): void {
  const arch = { width: opening, height, sill, spring: 0.72 };
  archWall(mesh, mat.stone, frame, width, bottom, top, wallDepth, arch);
  lancetWindow(mesh, mat.trim, mat.iron, frame, arch, wallDepth, lights);
}

function quadWall<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, length: number,
  interior: boolean, passage: boolean,
): void {
  const bottom = interior ? courtFloor : quad.floor - 1;
  const centralBay = 6.4;
  const bays = passage ? 2 : interior ? 5 : 8;
  const span = passage ? (length - centralBay) / 2 : length;
  const bayWidth = span / bays;
  const starts = passage ? [-length / 2, centralBay / 2] : [-length / 2];
  for (const start of starts) {
    for (let i = 0; i < bays; i++) {
      const across = start + (i + 0.5) * bayWidth;
      const p = place(frame, across, 0);
      const bay = { ...frame, x: p.x, z: p.z };
      windowBay(mesh, mat, bay, bayWidth, bottom, quad.floor + 5.6, quad.floor + 2.35, 1.93, 0.64);
      windowBay(mesh, mat, bay, bayWidth, quad.floor + 5.6, quad.floor + 10.1, quad.floor + 6.65, 2.38, 0.78);
      windowBay(mesh, mat, bay, bayWidth, quad.floor + 10.1, eave, quad.floor + 11.05,
        2.83, interior ? 1.68 : 1.02, 2);
      if (!interior && i > 0) {
        const pier = place(frame, start + i * bayWidth, 0, -wallDepth / 2);
        buttress(mesh, mat.stone, mat.trim, { ...frame, x: pier.x, z: pier.z },
          bottom, 7.7, 0.55, 0.63);
      }
    }
  }
  if (passage) {
    const portal = { width: QUAD_ENTRY.width, height: quad.floor + 8.9 - QUAD_ENTRY.y, sill: QUAD_ENTRY.y, spring: 0.70 };
    archWall(mesh, mat.stone, frame, centralBay, bottom, eave, wallDepth, portal);
    archTrim(mesh, mat.trim, frame, portal, 0.24, wallDepth / 2 + 0.08, interior ? 1 : -1);
  }
  for (const height of [eave - 0.17, quad.floor + 10.04]) {
    mesh.box(mat.trim, place(frame, 0, height), length, 0.17, wallDepth + 0.22, frame.yaw);
  }
  if (interior) {
    const count = Math.floor(length / 1.25);
    for (let i = 0; i < count; i++) {
      const across = length * ((i + 0.5) / count - 0.5);
      mesh.box(mat.stone, place(frame, across, eave + 0.39, 0.04), 0.68, 0.78, 0.59, frame.yaw);
      mesh.box(mat.trim, place(frame, across, eave + 0.81, 0.04), 0.78, 0.12, 0.66, frame.yaw);
    }
  }
}

function dormer<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, wall: Frame, across: number, ravineSide: boolean,
): void {
  const p = place(wall, across, 0, ravineSide ? 0.22 : 0.68);
  const front = { ...wall, x: p.x, z: p.z };
  const base = eave + (ravineSide ? 0.18 : 0.63);
  const shoulder = base + 1.79;
  const width = ravineSide ? 1.94 : 1.55;
  const length = ravineSide ? 2.85 : 2.30;
  windowBay(mesh, mat, front, width, base, shoulder, base + 0.22, 1.32, 0.65);
  const gableRise = ravineSide ? 1.82 : 1.54;
  gableWall(mesh, mat.stone, front, width, shoulder, gableRise);
  const center = place(front, 0, 0, length / 2);
  const frame = { ...front, x: center.x, z: center.z };
  for (const side of [-1, 1]) {
    mesh.box(mat.stone, place(frame, side * (width - 0.18) / 2, shoulder - 0.90),
      0.18, 1.8, length, frame.yaw);
  }
  pitchedRoof(mesh, mat.slate, mat.trim, frame, width, length, shoulder, gableRise, 0.10);
}

/** The ravine façade descends below the courtyard and ends in the projecting stair gable. */
function dormitoryFacade<M>(mesh: Masonry<M>, mat: HallMaterials<M>, wall: Frame): void {
  const bayWidth = 2.88;
  const bays = 10;
  const start = -quad.span / 2 - 0.7;
  const end = start + bays * bayWidth;
  const base = quad.floor - 8.6;
  for (let i = 0; i < bays; i++) {
    const { x, z } = place(wall, start + (i + 0.5) * bayWidth, 0);
    const bay = { ...wall, x, z };
    for (const [bottom, top, sill, height] of [
      [-8.6, -2.8, -6.85, 1.27], [-2.8, 1.5, -1.7, 1.35],
      [1.5, 5.52, 2.86, 1.56], [5.52, 9.9, 7.0, 1.58], [9.9, 15.0, 11.55, 1.65],
    ]) {
      windowBay(mesh, mat, bay, bayWidth, quad.floor + bottom, quad.floor + top, quad.floor + sill, height, 0.62);
    }
  }

  const center = QUAD_TOWERS.gryffindor.depth - quad.span / 2 - 6.7;
  const width = 6.7;
  const projection = 3.45;
  const shoulder = eave + 1.25;
  const peak = shoulder + 6.95;
  const point = place(wall, center, 0, -projection);
  const face = { ...wall, x: point.x, z: point.z };
  // Close the small return hidden at the tower end of the wing.
  for (const [left, right] of [[-quad.span / 2 - halfWing, start], [end, quad.span / 2 + halfWing]]) {
    mesh.box(mat.stone, place(wall, (left + right) / 2, (base + eave) / 2),
      right - left, eave - base, wallDepth, wall.yaw);
  }
  const footing = quad.floor - 14.5;
  mesh.box(mat.stone, place(wall, 0, (base + footing) / 2),
    quad.span + quad.wingWidth, base - footing, wallDepth, wall.yaw);
  mesh.box(mat.stone, place(face, 0, (base + footing) / 2),
    width, base - footing, wallDepth, face.yaw);
  mesh.box(mat.stone, place(face, 0, footing - 0.28, projection / 2),
    width + 0.38, 0.62, projection + wallDepth + 0.20, face.yaw);

  for (const side of [-1, 1]) {
    const p = place(face, side * width / 4, 0);
    const window = { ...face, x: p.x, z: p.z };
    for (const [bottom, top, sill] of [[-8.6, -2.8, -6.75], [-2.8, 2, -0.95], [2, 6.4, 3.67],
      [6.4, 10.8, 7.83], [10.8, 16.25, 12.2]]) {
      windowBay(mesh, mat, window, width / 2, quad.floor + bottom, quad.floor + top, quad.floor + sill, 1.65, 0.72);
    }
    mesh.box(mat.stone, place(face, side * (width - wallDepth) / 2, (footing + shoulder) / 2, projection / 2),
      wallDepth, shoulder - footing, projection + 0.2, face.yaw);
  }
  const steps = 7;
  const height = (peak - shoulder) / steps;
  const gable = { width: 0.67, height: 1.53, sill: shoulder + 0.82 };
  const gableStrip = width * (1 - 2 / steps);
  archWall(mesh, mat.stone, face, gableStrip, shoulder, shoulder + 3 * height, 0.53, gable);
  lancetWindow(mesh, mat.trim, mat.iron, face, gable, 0.53, 1);
  // The stepped masonry follows the two roof slopes and stands just proud of the slates.
  for (let i = 0; i < steps; i++) {
    const stepY = shoulder + i * height;
    const stepWidth = width * (1 - i / steps);
    if (i >= 3) mesh.box(mat.stone, place(face, 0, stepY + height / 2), stepWidth, height, 0.59, face.yaw);
    for (const side of [-1, 1]) {
      if (i < 2) {
        mesh.box(mat.stone, place(face, side * (stepWidth + gableStrip) / 4, stepY + height / 2),
          (stepWidth - gableStrip) / 2, height, 0.53, face.yaw);
      }
      const stepX = side * (stepWidth / 2 - 0.25);
      mesh.box(mat.stone, place(face, stepX, stepY + height / 2), 0.50, height, 0.77, face.yaw);
      mesh.box(mat.trim, place(face, stepX, stepY + height + 0.025), 0.55, 0.115, 0.86, face.yaw);
    }
  }
  const roof = place(face, 0, 0, (projection + 4.1) / 2);
  pitchedRoof(mesh, mat.slate, mat.trim, { ...face, x: roof.x, z: roof.z },
    width - 0.30, projection + 4.1, shoulder - 0.08, peak - shoulder - 0.28, 0.06);
}

export function staircaseQuadrangle<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const outside = corners(-halfWing);
  const inside = corners(halfWing);
  const ridge = corners(0);
  const outerRoof = corners(-halfWing - 0.38);
  const innerRoof = corners(halfWing - 0.06);
  const roofFaces: Face[] = [];
  const plinth = QUAD_WING_PLINTH;
  const plinthDepth = quad.wingWidth + plinth.outerOverhang + plinth.innerOverhang;
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const outer = edge(quad, outside[i], outside[next]);
    if (i === 1) {
      dormitoryFacade(mesh, mat, outer);
    } else {
      quadWall(mesh, mat, outer, quad.span + quad.wingWidth, false, i === 0);
      // The flank fits between the two cross-wings at their shared foundation level.
      const length = i === 3 ? quad.span - quad.wingWidth - 2 * plinth.innerOverhang
        : quad.span + quad.wingWidth + 2 * plinth.endOverhang;
      const depth = plinthDepth / 2 - plinth.outerOverhang;
      const bottom = i === 0 ? plinth.entranceBottom : i === 2 ? plinth.rearBottom : plinth.flankBottom;
      mesh.box(mat.stone, place(outer, 0, (plinth.top + bottom) / 2, depth),
        length, plinth.top - bottom, plinthDepth, outer.yaw);
    }
    quadWall(mesh, mat, edge(quad, inside[i], inside[next]), quad.span - quad.wingWidth, true, i === 0);
    for (const boundary of [outerRoof, innerRoof]) {
      const low = [boundary[i], boundary[next]].map(([a, d]) => place(quad, a, eave, d));
      const high = [ridge[next], ridge[i]].map(([a, d]) => place(quad, a, eave + rise, d));
      roofFaces.push({ points: [...low, ...high], outward: up });
    }
    const dormers = i === 0 ? [-4.6, 2.5, 7.4, 12.3]
      : i === 1 ? [-10.4, -6.45, -2.5, 1.45, 5.4]
      : [-10.9, -5.5, 5.5, 10.9];
    for (const across of dormers) {
      dormer(mesh, mat, outer, across, i === 1);
    }
    for (const across of i === 1 ? [-8.2, -0.55, 6.75] : i % 2 === 0 ? [-8.2, 7.6] : [-4.8, 8.4]) {
      const p = place(outer, across, eave + rise - 0.8, halfWing + 0.65);
      mesh.box(mat.stone, p.add(new Vector3(0, 1.5, 0)), 1.15, 3, 0.86, outer.yaw);
      mesh.box(mat.trim, p.add(new Vector3(0, 3, 0)), 1.38, 0.18, 1.08, outer.yaw);
      for (const side of [-1, 1]) {
        const stack = { ...outer, x: p.x, z: p.z };
        mesh.box(mat.iron, place(stack, side * 0.25, p.y + 3.24), 0.25, 0.42, 0.28, outer.yaw);
      }
    }
  }
  mesh.surface(mat.slate, roofFaces);
  const court = place(quad, quad.span / 2, (quad.floor - 0.95 + courtFloor) / 2, quad.span / 2);
  const courtWidth = quad.span - quad.wingWidth + 0.52;
  mesh.box(mat.stone, court, courtWidth, courtFloor - quad.floor + 0.95, courtWidth, quad.yaw);
  mesh.box(mat.trim, place(quad, quad.span / 2, courtFloor + 0.05, quad.span / 2),
    QUAD_ENTRY.pavingWidth, 0.10, QUAD_ENTRY.pavingWidth, quad.yaw);
}

export function hospitalWing<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { across, courtEnd, width, length, linkLength, linkWidth } = HOSPITAL_WING;
  const p = place(quad, across, 0, courtEnd);
  const frame = { x: p.x, z: p.z, yaw: quad.yaw };
  const shoulder = quad.floor + 25.9;
  const half = width / 2;
  const nose: PlanPoint[] = [[-half + 1.5, 0], [half - 1.5, 0], [half, 1.65],
    [half, length], [-half, length], [-half, 1.65]];
  const roofFaces: Face[] = [];
  const frontRidge = place(frame, 0, shoulder + 5.4, 3.45);
  const backRidge = place(frame, 0, shoulder + 5.4, length - 2.35);
  for (let i = 0; i < nose.length; i++) {
    const a = nose[i];
    const b = nose[(i + 1) % nose.length];
    const face = edge(frame, a, b);
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bays = i === 2 || i === 4 ? 4 : i === 0 ? 2 : 1;
    for (let bay = 0; bay < bays; bay++) {
      const position = place(face, span * ((bay + 0.5) / bays - 0.5), 0);
      const window = { ...face, x: position.x, z: position.z };
      if (i === 3) {
        mesh.box(mat.stone, place(window, 0, (courtFloor + shoulder) / 2), span,
          shoulder - courtFloor, wallDepth, face.yaw);
      } else {
        windowBay(mesh, mat, window, span / bays, courtFloor, quad.floor + 16.5, quad.floor + 10.3, 1.7, 0.60);
        windowBay(mesh, mat, window, span / bays, quad.floor + 16.5, shoulder, quad.floor + 20.15, 4.85,
          i === 1 || i === 5 ? 1.08 : 1.43, 2);
      }
    }
    mesh.box(mat.trim, place(face, 0, shoulder - 0.12), span + 0.16, 0.24, 0.73, face.yaw);
    const points = [a, b].map(([x, z]) => place(frame, x * 1.08, shoulder, z < 0.01 ? -0.25 : z));
    if (i === 2) points.push(backRidge, frontRidge);
    else if (i === 4) points.push(frontRidge, backRidge);
    else points.push(i === 3 ? backRidge : frontRidge);
    roofFaces.push({ points, outward: up });
  }
  mesh.surface(mat.slate, roofFaces);

  // The covered connector crosses an open arch on the way toward the Clock Tower.
  const linkStart = length - 0.08;
  const linkCenter = place(frame, 0, 0, linkStart + linkLength / 2);
  const link = { ...frame, x: linkCenter.x, z: linkCenter.z };
  const archFrame = { ...link, yaw: link.yaw - Math.PI / 2 };
  const linkEave = quad.floor + 21.55;
  const windowBase = quad.floor + 16.45;
  const arch = { width: linkLength - 2.65, height: 13.45, sill: quad.floor, spring: 0.72 };
  archWall(mesh, mat.stone, archFrame, linkLength, quad.floor - 1, windowBase, linkWidth, arch);
  const pierWidth = (linkLength - arch.width) / 2;
  for (const end of [-1, 1]) {
    mesh.box(mat.stone, place(archFrame, end * (linkLength - pierWidth) / 2, quad.floor - 5.5),
      pierWidth + 0.06, 9, linkWidth, archFrame.yaw);
  }
  for (const side of [-1, 1]) {
    archTrim(mesh, mat.trim, archFrame, arch, 0.26, linkWidth / 2 + 0.07, side);
    const bayWidth = linkLength / 4;
    for (let bay = 0; bay < 4; bay++) {
      const point = place(archFrame, (bay - 1.5) * bayWidth, 0, side * (linkWidth - wallDepth) / 2);
      windowBay(mesh, mat, { ...archFrame, x: point.x, z: point.z }, bayWidth,
        windowBase, linkEave, windowBase + 0.46, 4.15, 1.48, 2);
    }
  }
  for (const side of [-1, 1]) {
    const point = place(link, 0, 0, side * linkLength / 2);
    const end = { ...link, x: point.x, z: point.z };
    mesh.box(mat.stone, place(end, 0, (windowBase + linkEave) / 2),
      linkWidth, linkEave - windowBase, wallDepth, end.yaw);
    gableWall(mesh, mat.stone, end, linkWidth, linkEave, 2.85);
  }
  pitchedRoof(mesh, mat.slate, mat.trim, link, linkWidth, linkLength, linkEave, 2.85, 0.22);
}
