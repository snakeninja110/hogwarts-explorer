import { Vector3 } from '@babylonjs/core';
import { QUAD_ENTRY, STAIRCASE_QUAD, VIADUCT } from '../castleLayout';
import { place, type Face, type Masonry } from './Masonry';
import { stairRun } from './StoneStairs';
import { viaductBranch } from './Viaduct';

const quad = STAIRCASE_QUAD;
const entry = QUAD_ENTRY;
const up = Vector3.Up();
const width = 3.04;
const railWidth = 0.33;
const railHeight = 0.82;
const facade = -quad.wingWidth / 2;
const entryPoint = place(quad, entry.across, entry.y, facade);
const branch = Vector3.Center(viaductBranch[0], viaductBranch[1]);
// The lower landing follows the arcade. The grade begins at the bend and ends before the arch.
const corner = new Vector3(branch.x, VIADUCT.deckY, 4.4);
const shoulder = new Vector3(-25.4, VIADUCT.deckY + 0.77, 7.2);
const upperLanding = new Vector3(-17.4, entry.y, 6.4);
const turn = place(quad, entry.across, entry.y, facade - 2.05);
const route = [branch, corner, shoulder, upperLanding, turn, entryPoint];

const across = (a: Vector3, b: Vector3) => new Vector3(b.z - a.z, 0, a.x - b.x).normalize();
const edges = route.map((point, i): readonly [Vector3, Vector3] => {
  if (i === 0) return [viaductBranch[0], viaductBranch[1]];
  const before = across(route[i - 1], point);
  const after = i < route.length - 1 ? across(point, route[i + 1]) : before;
  const bisector = before.add(after).normalize();
  const offset = bisector.scale(width / (2 * Vector3.Dot(before, bisector)));
  return [point.subtract(offset), point.add(offset)];
});

export const quadWalkwayFloors = edges.slice(1).map(([left, right], i) =>
  [edges[i][0], edges[i][1], right, left]);

function triangles([a, b, c, d]: Vector3[]): Vector3[][] {
  return [[a, b, c], [a, c, d]];
}

// Extend each inner edge at its own elevation to the tower base and the wing façade.
const terraceBack = [
  [-30.19, 7.35], [-27.2, 14.6], [-17.2, 12.1], [-14.55, 9.82], [-13.62, 8.75],
] as const;
const terraceSections = terraceBack.map(([x, z], i) => {
  const [edge] = edges[i + 1];
  return { edge, back: new Vector3(x, edge.y, z) };
});
export const quadWalkwayTerrace = terraceSections.slice(1).flatMap(({ edge, back }, i) => {
  const start = terraceSections[i];
  return triangles([start.edge, edge, back, start.back]);
});

// Only the ravine-facing edge has a parapet.
export const quadWalkwayRails = edges.slice(1).map(([, end], i) => {
  const start = edges[i][1];
  const run = stairRun(start, end, railWidth, 0);
  return { start, end, ...run, center: run.center.add(new Vector3(0, railHeight / 2, 0)), height: railHeight };
});

// Match the arch reveal and the front edge of the existing courtyard paving.
const insideEdge = (quad.span - entry.pavingWidth) / 2;
export const quadPortalFloor = [
  place(quad, entry.across - entry.width / 2, entry.y, facade),
  place(quad, entry.across + entry.width / 2, entry.y, facade),
  place(quad, entry.across + entry.width / 2, entry.y, insideEdge),
  place(quad, entry.across - entry.width / 2, entry.y, insideEdge),
];

export function quadWalkway<M>(mesh: Masonry<M>, stone: M, trim: M, paving: M, ground: M): void {
  const foundation = VIADUCT.deckY - 10.2;
  const retainingWall: Face[] = quadWalkwayFloors.map(([, start, end]) => ({
    points: [new Vector3(start.x, foundation, start.z), new Vector3(end.x, foundation, end.z), end, start],
    outward: across(start, end),
  }));
  mesh.surface(stone, retainingWall);
  mesh.surface(paving, [...quadWalkwayFloors.flatMap(triangles), quadPortalFloor].map(points => ({ points, outward: up })));
  mesh.surface(ground, quadWalkwayTerrace.map(points => ({ points, outward: up })));

  for (const rail of quadWalkwayRails) {
    mesh.box(stone, rail.center, rail.width, rail.height, rail.slopeLength + 0.15, rail.frame.yaw).rotation.x = rail.angle;
    const coping = rail.center.add(new Vector3(0, rail.height / 2, 0));
    mesh.box(trim, coping, rail.width + 0.08, 0.10, rail.slopeLength + 0.15, rail.frame.yaw).rotation.x = rail.angle;
    const count = Math.max(1, Math.round(rail.length / 1.02));
    for (let i = 0; i < count; i++) {
      const merlon = Vector3.Lerp(rail.start, rail.end, (i + 0.5) / count).addInPlaceFromFloats(0, railHeight + 0.15, 0);
      mesh.box(stone, merlon, rail.width, 0.37, 0.60, rail.frame.yaw);
      mesh.box(trim, merlon.add(new Vector3(0, 0.205, 0)), rail.width + 0.09, 0.09, 0.69, rail.frame.yaw);
    }
  }

  // Stone reveals continue through the wing so the portal reads as a passage from either side.
  const center = (facade + insideEdge) / 2;
  const span = insideEdge - facade - entry.wallDepth;
  for (const side of [-1, 1]) {
    mesh.box(stone, place(quad, entry.across + side * (entry.width / 2 + 0.13), entry.y + 2.72, center),
      0.26, 5.44, span, quad.yaw);
  }
}
