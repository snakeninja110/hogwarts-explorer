import { Vector3 } from '@babylonjs/core';
import { CASTLE_APPROACH, ENTRANCE_COURTYARD, VIADUCT, VIADUCT_ENTRY_Z } from '../castleLayout';
import { normal, place, type Face, type Frame, type Masonry } from './Masonry';

const { length, width, deckY, landingLength, landingWidth, yaw } = VIADUCT;
const up = Vector3.Up();
const landingEnd = length + landingLength;
const approachX = CASTLE_APPROACH.x + ENTRANCE_COURTYARD.width / 2 - 0.41;
const throat = ENTRANCE_COURTYARD.openingWidth / 2;

export const viaductApproach = [
  new Vector3(approachX, deckY, VIADUCT_ENTRY_Z - throat),
  place(VIADUCT, 0, deckY, -width / 2),
  place(VIADUCT, 0, deckY, width / 2),
  new Vector3(approachX, deckY, VIADUCT_ENTRY_Z + throat),
];

export const viaductLanding = [
  place(VIADUCT, length, deckY, -width / 2),
  place(VIADUCT, landingEnd, deckY, -landingWidth / 2),
  place(VIADUCT, landingEnd, deckY, landingWidth / 2),
  place(VIADUCT, length, deckY, width / 2),
];

export const VIADUCT_RAIL = { height: 1.06, width: 0.32 };
// The inland edge of the bridgehead opens onto the staircase quadrangle walk.
export const viaductBranch = [0.09, 0.74].map(t =>
  Vector3.Lerp(viaductApproach[3], viaductApproach[2], t));
export const viaductRailings = [
  [viaductApproach[0], viaductApproach[1]],
  [viaductBranch[1], viaductApproach[2]],
  [viaductApproach[1], viaductLanding[0]], [viaductApproach[2], viaductLanding[3]],
  [viaductLanding[0], viaductLanding[1]], [viaductLanding[3], viaductLanding[2]],
  [viaductLanding[1], viaductLanding[2]],
].map(([start, end]) => ({
  center: Vector3.Center(start, end),
  length: Vector3.Distance(start, end),
  yaw: Math.atan2(start.z - end.z, end.x - start.x),
}));

interface BridgeMaterials<M> {
  stone: M;
  trim: M;
  paving: M;
}

/** True semicircular openings with a stone soffit and an arch ring on either face. */
function roundSpan<M>(
  mesh: Masonry<M>, mat: BridgeMaterials<M>, frame: Frame,
  radius: number, spring: number, top: number, depth: number, ringWidth: number,
): void {
  const stone: Face[] = [];
  const ring: Face[] = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const a = Math.PI * (1 - i / steps);
    const b = Math.PI * (1 - (i + 1) / steps);
    const arc = (angle: number, r: number, d: number) =>
      place(frame, r * Math.cos(angle), spring + r * Math.sin(angle), d);
    for (const side of [-1, 1]) {
      const d = side * depth / 2;
      stone.push({
        points: [arc(a, radius, d), arc(b, radius, d),
          place(frame, radius * Math.cos(b), top, d), place(frame, radius * Math.cos(a), top, d)],
        outward: normal(frame.yaw, side),
      });
      const face = side * (depth / 2 + 0.045);
      ring.push({
        points: [arc(a, radius, face), arc(b, radius, face),
          arc(b, radius + ringWidth, face), arc(a, radius + ringWidth, face)],
        outward: normal(frame.yaw, side),
      });
    }
    stone.push({
      points: [arc(a, radius, -depth / 2), arc(b, radius, -depth / 2),
        arc(b, radius, depth / 2), arc(a, radius, depth / 2)],
      outward: place(frame, -Math.cos((a + b) / 2), -Math.sin((a + b) / 2)).subtract(place(frame, 0, 0)),
    });
  }
  mesh.surface(mat.stone, stone);
  mesh.surface(mat.trim, ring);
}

function pier<M>(
  mesh: Masonry<M>, mat: BridgeMaterials<M>, across: number,
  pierWidth: number, depth: number, spring: number, top: number,
): void {
  const footY = 0.08;
  const offsets = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const ring = (height: number, span: number, thickness: number) =>
    offsets.map(([x, z]) => place(VIADUCT, across + x * span / 2, height, z * thickness / 2));
  const foot = ring(footY, pierWidth + 0.28, depth + 0.55);
  const shoulder = ring(spring, pierWidth, depth);
  const directions = [normal(yaw, -1), normal(yaw + Math.PI / 2, 1),
    normal(yaw, 1), normal(yaw + Math.PI / 2, -1)];
  mesh.surface(mat.stone, foot.map((point, i) => {
    const next = (i + 1) % foot.length;
    return { points: [point, foot[next], shoulder[next], shoulder[i]], outward: directions[i] };
  }));
  mesh.box(mat.stone, place(VIADUCT, across, (spring + top) / 2), pierWidth, top - spring, depth, yaw);
  mesh.box(mat.trim, place(VIADUCT, across, spring - 0.085), pierWidth + 0.18, 0.19, depth + 0.22, yaw);
}

function platform<M>(mesh: Masonry<M>, mat: BridgeMaterials<M>, points: Vector3[], depth: number): void {
  const lower = points.map(p => p.subtract(new Vector3(0, depth, 0)));
  const faces = points.map((p, i) => {
    const next = (i + 1) % points.length;
    const d = points[next].subtract(p);
    return { points: [p, points[next], lower[next], lower[i]], outward: new Vector3(d.z, 0, -d.x) };
  });
  mesh.surface(mat.stone, [...faces, { points: lower, outward: up.negate() }]);
  mesh.surface(mat.paving, [{ points, outward: up }]);
}

export function viaduct<M>(mesh: Masonry<M>, mat: BridgeMaterials<M>): void {
  const galleryFloor = deckY - 3.33;
  const archSpring = galleryFloor - 1.78;
  const lowerWidth = width - 0.37;
  const bays = 9;
  const pitch = length / bays;
  const radius = pitch * 0.347;
  const pierWidth = pitch - 2 * radius;
  const placeBay = (across: number, depth = 0): Frame => {
    const p = place(VIADUCT, across, 0, depth);
    return { x: p.x, z: p.z, yaw };
  };
  for (let bay = 0; bay < bays; bay++) {
    roundSpan(mesh, mat, placeBay((bay + 0.5) * pitch), radius, archSpring, galleryFloor, lowerWidth, 0.18);
  }
  for (let i = 1; i < bays; i++) {
    pier(mesh, mat, i * pitch, pierWidth, lowerWidth, archSpring, galleryFloor);
  }
  for (const end of [0, length]) {
    pier(mesh, mat, end, pierWidth, lowerWidth, archSpring, galleryFloor);
  }
  mesh.box(mat.trim, place(VIADUCT, length / 2, galleryFloor - 0.15),
    length, 0.29, lowerWidth + 0.19, yaw);
  mesh.box(mat.stone, place(VIADUCT, length / 2, galleryFloor - 0.015),
    length, 0.13, lowerWidth, yaw);

  const upperBays = bays * 2;
  const upperPitch = length / upperBays;
  const upperRadius = upperPitch * 0.302;
  const postWidth = upperPitch - 2 * upperRadius;
  const spring = galleryFloor + 1.49;
  const sill = galleryFloor + 0.30;
  const top = deckY - 0.46;
  const wall = 0.43;
  for (const side of [-1, 1]) {
    const depth = side * (lowerWidth - wall) / 2;
    mesh.box(mat.stone, place(VIADUCT, length / 2, (galleryFloor + sill) / 2, depth),
      length, sill - galleryFloor, wall, yaw);
    mesh.box(mat.trim, place(VIADUCT, length / 2, sill - 0.02, depth),
      length, 0.12, wall + 0.12, yaw);
    for (let i = 0; i < upperBays; i++) {
      roundSpan(mesh, mat, placeBay((i + 0.5) * upperPitch, depth),
        upperRadius, spring, top, wall, 0.095);
    }
    for (let i = 0; i <= upperBays; i++) {
      mesh.box(mat.stone, place(VIADUCT, i * upperPitch, (sill + top) / 2, depth),
        postWidth, top - sill, wall, yaw);
      mesh.box(mat.trim, place(VIADUCT, i * upperPitch, spring - 0.03, depth),
        postWidth + 0.07, 0.10, wall + 0.12, yaw);
    }
  }
  mesh.box(mat.trim, place(VIADUCT, length / 2, top + 0.06), length, 0.18, width + 0.15, yaw);
  mesh.box(mat.stone, place(VIADUCT, length / 2, (deckY + top) / 2), length, deckY - top, width, yaw);
  mesh.surface(mat.paving, [{ points: [viaductApproach[1], viaductLanding[0], viaductLanding[3], viaductApproach[2]]
    .map(p => p.add(new Vector3(0, 0.009, 0))), outward: up }]);
  platform(mesh, mat, viaductApproach, 1.1);
  platform(mesh, mat, viaductLanding, 1.18);

  for (const rail of viaductRailings) {
    mesh.box(mat.stone, rail.center.add(new Vector3(0, VIADUCT_RAIL.height / 2, 0)),
      rail.length + 0.08, VIADUCT_RAIL.height, VIADUCT_RAIL.width, rail.yaw);
    mesh.box(mat.trim, rail.center.add(new Vector3(0, VIADUCT_RAIL.height, 0)),
      rail.length + 0.12, 0.14, VIADUCT_RAIL.width + 0.15, rail.yaw);
  }
  for (const edge of [-1, 1]) {
    for (const x of [0, length / 3, length * 2 / 3, length]) {
      const p = place(VIADUCT, x, deckY + 0.66, edge * width / 2);
      mesh.box(mat.stone, p, 0.56, 1.32, 0.55, yaw);
      mesh.box(mat.trim, p.add(new Vector3(0, 0.69, 0)), 0.68, 0.16, 0.65, yaw);
    }
  }
}
