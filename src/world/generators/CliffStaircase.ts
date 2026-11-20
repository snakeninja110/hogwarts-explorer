import { Vector3 } from '@babylonjs/core';
import { BOATHOUSE, CASTLE_APPROACH, CLIFF_STAIR_TURNS, CLIFF_STAIR_WIDTH, ENTRANCE_COURTYARD } from '../castleLayout';
import { normal, place, type Masonry } from './Masonry';
import { rockTerrain } from './RockTerrain';
import { stairRun, stoneStairs } from './StoneStairs';

const wallWidth = 0.23;
const wallHeight = 0.69;
const copingHeight = 0.115;
const opening = CLIFF_STAIR_WIDTH / 2 + wallWidth + 0.045;
const up = Vector3.Up();
const gateLanding = CLIFF_STAIR_TURNS[CLIFF_STAIR_TURNS.length - 1];
export const cliffGateLink = {
  center: new Vector3(gateLanding.x + 1.07, CASTLE_APPROACH.floorY - 0.24, gateLanding.z),
  width: ENTRANCE_COURTYARD.openingWidth,
  length: 1.55,
  thickness: 0.48,
};

interface WallEdge {
  start: Vector3;
  end: Vector3;
  outward: Vector3;
}

const landingRadius = (round?: boolean) => round ? 1.67 : 1.53;
const landingInset = (round?: boolean) => Math.sqrt(landingRadius(round) ** 2 - opening ** 2) - 0.16;

export const cliffStairRuns = CLIFF_STAIR_TURNS.slice(1).map((end, i) => {
  const start = CLIFF_STAIR_TURNS[i];
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const dx = (end.x - start.x) / distance;
  const dz = (end.z - start.z) / distance;
  const first = landingInset(start.round);
  const last = landingInset(end.round);
  return stairRun(
    { x: start.x + dx * first, y: start.y, z: start.z + dz * first },
    { x: end.x - dx * last, y: end.y, z: end.z - dz * last },
    CLIFF_STAIR_WIDTH, Math.ceil((end.y - start.y) / 0.17),
  );
});

export const cliffLandings = CLIFF_STAIR_TURNS.map(({ x, y, z, round }, i) => {
  const before = CLIFF_STAIR_TURNS[i - 1] ?? place(BOATHOUSE, 0, y, BOATHOUSE.length);
  const after = CLIFF_STAIR_TURNS[i + 1] ?? { x: x + 1, z };
  const exits = [before, after].map(p => Math.atan2(p.z - z, p.x - x));
  const radius = landingRadius(round);
  const halfAngle = Math.asin(opening / radius);
  const full = 2 * Math.PI;
  const wrap = (a: number) => (a + full) % full;
  const angles = exits.flatMap(a => [wrap(a - halfAngle), wrap(a + halfAngle)]).sort((a, b) => a - b);
  const points: Vector3[] = [];
  const walls: WallEdge[] = [];
  const thresholds: WallEdge[] = [];
  let lantern: Vector3 | null = null;
  let longestArc = 0;
  const point = (a: number) => new Vector3(x + radius * Math.cos(a), y, z + radius * Math.sin(a));

  for (const [j, a] of angles.entries()) {
    const b = angles[j + 1] ?? angles[0] + full;
    const mid = (a + b) / 2;
    const passage = exits.some(e => Math.cos(mid - e) > Math.cos(halfAngle));
    const count = passage ? 1 : Math.ceil((b - a) / (round ? Math.PI / 12 : Math.PI / 2.4));
    if (round && !passage && b - a > longestArc) {
      lantern = point(mid);
      longestArc = b - a;
    }
    for (let k = 0; k < count; k++) {
      const start = point(a + (b - a) * k / count);
      const end = point(a + (b - a) * (k + 1) / count);
      const outward = new Vector3(end.z - start.z, 0, start.x - end.x).normalize();
      points.push(start);
      (passage ? thresholds : walls).push({ start, end, outward });
    }
  }
  return { points, walls, thresholds, lantern };
});

const flightWalls: WallEdge[] = cliffStairRuns.flatMap(run => [-1, 1].map(side => ({
  start: place(run.frame, side * (run.width + wallWidth) / 2, run.base),
  end: place(run.frame, side * (run.width + wallWidth) / 2, run.base + run.rise, run.length),
  outward: normal(run.frame.yaw + Math.PI / 2, side),
})));

const wallEdges = [...flightWalls, ...cliffLandings.flatMap(landing => landing.walls)];
const edgeBox = ({ start, end }: WallEdge) => {
  const edge = end.subtract(start);
  return {
    center: Vector3.Center(start, end),
    length: edge.length() + 0.065,
    yaw: Math.atan2(edge.x, edge.z),
    pitch: -Math.atan2(edge.y, Math.hypot(edge.x, edge.z)),
  };
};

export const cliffWallColliders = wallEdges.map(edge => {
  const box = edgeBox(edge);
  return {
    ...box,
    center: box.center.addInPlaceFromFloats(0, wallHeight / 2, 0),
    width: wallWidth,
    height: wallHeight + copingHeight,
  };
});

export function cliffStaircase<M>(mesh: Masonry<M>, stone: M, trim: M, metal: M, amber: M): void {
  const link = cliffGateLink;
  mesh.box(stone, link.center, link.length, link.thickness, link.width);
  for (const run of cliffStairRuns) {
    stoneStairs(mesh, stone, trim, run);
    if (run.steps === 0) {
      const courses = Math.ceil(run.length / 1.12);
      const depth = run.length / courses;
      for (let i = 0; i < courses; i++) {
        mesh.box(stone, place(run.frame, 0, run.base + 0.017, (i + 0.5) * depth),
          run.width, 0.038, depth - 0.022, run.frame.yaw);
      }
    }
  }
  for (const landing of cliffLandings) {
    mesh.surface(stone, [{ points: landing.points, outward: up }]);
    for (const { start, end, outward } of landing.thresholds) {
      mesh.surface(stone, [{
        points: [start.add(new Vector3(0, -0.42, 0)), end.add(new Vector3(0, -0.42, 0)), end, start], outward,
      }]);
    }
    if (landing.lantern) {
      const at = landing.lantern;
      mesh.box(metal, at.clone().addInPlaceFromFloats(0, wallHeight + 0.18, 0), 0.038, 0.26, 0.038);
      mesh.box(amber, at.clone().addInPlaceFromFloats(0, wallHeight + 0.34, 0), 0.104, 0.12, 0.104);
      mesh.box(metal, at.clone().addInPlaceFromFloats(0, wallHeight + 0.41, 0), 0.13, 0.036, 0.13);
    }
  }
  for (const edge of wallEdges) {
    stairWall(mesh, stone, edge);
    const cap = edgeBox(edge);
    mesh.box(trim, cap.center.addInPlaceFromFloats(0, wallHeight + copingHeight * 0.37, 0),
      wallWidth + 0.1, copingHeight, cap.length + 0.04, cap.yaw).rotation.x = cap.pitch;
  }
}

function stairWall<M>(mesh: Masonry<M>, stone: M, { start, end, outward }: WallEdge): void {
  const top = (p: Vector3, sign: number) => p.add(outward.scale(sign * wallWidth / 2)).addInPlaceFromFloats(0, wallHeight, 0);
  const lower = (p: Vector3, sign: number) => {
    const footing = p.add(outward.scale(sign * wallWidth / 2 + (sign > 0 ? 0.31 : 0)));
    footing.y = sign > 0 ? Math.max(-0.04, p.y - CASTLE_APPROACH.floorY * 0.47) : p.y - 0.26;
    return footing;
  };
  const a = top(start, 1), b = top(end, 1), c = top(end, -1), d = top(start, -1);
  const e = lower(start, 1), f = lower(end, 1), g = lower(end, -1), h = lower(start, -1);
  const direction = end.subtract(start).normalize();
  mesh.surface(stone, [
    { points: [e, f, b, a], outward },
    { points: [h, d, c, g], outward: outward.negate() },
    { points: [a, b, c, d], outward: up },
    { points: [e, a, d, h], outward: direction.negate() },
    { points: [f, g, c, b], outward: direction },
  ]);
}

// Rock below the stairs follows the ridge, leaving the treads and landings exposed.
export function cliffSpur<M>(mesh: Masonry<M>, rock: M): void {
  const rows = 36;
  const columns = 34;
  const grid = Array.from({ length: rows + 1 }, (_, row) => Array.from({ length: columns + 1 }, (_, col) => {
    const t = row / rows;
    const v = col / columns * 2 - 1;
    const x = -90 + 44 * t;
    const breadth = Math.sin(Math.PI * t);
    const z = -27 + 40 * t + 8 * breadth + v * (7 + 14 * t + 10 * breadth)
      + Math.sin(row * 1.7 + col * 0.8) * 0.57;
    const shoulder = Math.max(0, 1 - Math.pow(Math.abs(v), 2.8));
    let y = ((CASTLE_APPROACH.floorY - 0.05) * Math.pow(t, 1.05)
      + 0.8 * Math.sin(row * 1.3 + col * 1.9)) * shoulder;
    for (const run of cliffStairRuns) {
      const dx = x - run.frame.x;
      const dz = z - run.frame.z;
      const along = Math.max(0, Math.min(run.length, dx * Math.sin(run.frame.yaw) + dz * Math.cos(run.frame.yaw)));
      const at = place(run.frame, 0, run.base + run.rise * along / run.length, along);
      const distance = Math.hypot(x - at.x, z - at.z);
      y = Math.min(y, at.y - 0.28 + Math.max(0, distance - 1.9) * 1.38);
    }
    return new Vector3(x, Math.max(0, y), z);
  }));
  // Start at the castle end so the stair slope retains its existing grid diagonals.
  rockTerrain(mesh, rock, grid.reverse());
}
