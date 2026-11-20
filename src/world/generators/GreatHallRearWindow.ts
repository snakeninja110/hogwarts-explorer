import { Vector3 } from '@babylonjs/core';
import { WALL_DEPTH } from '../castleLayout';
import { archTrim, archWall } from './GothicParts';
import type { HallMaterials } from './GreatHallArchitecture';
import { normal, place, type Frame, type Masonry } from './Masonry';

/** The high table window projects from the gable on a stepped stone corbel. */
export function greatHallRearWindow<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, rear: Frame, floor: number, wallWidth: number, eave: number, interior: boolean,
): void {
  const sill = floor + 3.65;
  const head = floor + 11.08;
  const opening = 6.02;
  const width = 5.48;
  const halfWall = WALL_DEPTH / 2;
  const screenDepth = -1.57;
  const at = (x: number, y: number, z: number) => place(rear, x, y, z);
  const stone = mat.rearTrim ?? mat.trim;
  const box = (m: M, x: number, y: number, z: number, w: number, h: number, d: number) =>
    mesh.box(m, at(x, y, z), w, h, d, rear.yaw);

  const pier = (wallWidth - opening) / 2;
  for (const side of [-1, 1]) {
    box(mat.stone, side * (opening + pier) / 2, (floor + eave) / 2, 0, pier, eave - floor, WALL_DEPTH);
    // Thick internal jamb, splayed into the projecting window bay.
    if (!interior) mesh.surface(stone, [{
      points: [
        at(side * opening / 2, sill, halfWall), at(side * width / 2, sill, screenDepth),
        at(side * width / 2, head, screenDepth), at(side * opening / 2, head, halfWall),
      ],
      outward: normal(rear.yaw - side * Math.PI / 2, 1),
    }, {
      points: [
        at(side * opening / 2, sill - 0.1, -halfWall), at(side * width / 2, sill - 0.1, screenDepth - 0.13),
        at(side * width / 2, head + 0.22, screenDepth - 0.13), at(side * opening / 2, head + 0.22, -halfWall),
      ],
      outward: normal(rear.yaw + side * Math.PI / 2, 1),
    }]);
    box(stone, side * opening / 2, (sill + head) / 2, halfWall + 0.05, 0.22, head - sill + 0.26, 0.17);
  }
  box(mat.stone, 0, (floor + sill) / 2, 0, opening, sill - floor, WALL_DEPTH);
  box(mat.stone, 0, (eave + head) / 2, 0, opening, eave - head, WALL_DEPTH);
  // Close the projecting bay at the lintel and form the window seat at its foot.
  const liningDepth = halfWall - screenDepth;
  box(stone, 0, sill - 0.11, (halfWall + screenDepth) / 2, opening + 0.15, 0.22, liningDepth + 0.32);
  box(stone, 0, head + 0.11, (halfWall + screenDepth) / 2, opening + 0.12, 0.22, liningDepth + 0.22);

  if (!interior) for (const [base, top, span, projection] of [
    [1.46, 1.69, 2.62, 0.49], [1.69, 1.87, 3.22, 0.63], [1.87, 2.06, 3.77, 0.80],
    [2.06, 2.25, 4.25, 0.95], [2.25, 2.48, 4.78, 1.12], [2.48, 2.73, 5.23, 1.25],
    [2.73, 3.46, 5.62, 1.29],
  ]) {
    box(top === 3.46 ? mat.stone : stone, 0, floor + (base + top) / 2, -halfWall - projection / 2 + 0.035,
      span, top - base, projection + 0.07);
  }

  const p = at(0, floor, screenDepth);
  const face = { x: p.x, z: p.z, yaw: rear.yaw };
  const glassBottom = sill + 0.03;
  const glassTop = head - 0.11;
  const glazing = mat.rearGlass ?? mat.glass;
  const pane = [
    at(-width / 2, glassBottom, screenDepth), at(width / 2, glassBottom, screenDepth),
    at(width / 2, glassTop, screenDepth), at(-width / 2, glassTop, screenDepth),
  ];
  mesh.surface(glazing, [-1, 1].map(side => ({
    points: pane.map(point => point.add(normal(rear.yaw, side).scale(0.008))),
    outward: normal(rear.yaw, side),
    uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
  })));

  const bay = width / 3;
  if (interior) {
    // Andy's oriel has three rectangular lights and narrow glazed returns.
    for (const side of [-1, 1]) {
      mesh.surface(glazing, [{
        points: [at(side * width / 2, glassBottom, screenDepth),
          at(side * opening / 2, glassBottom, halfWall),
          at(side * opening / 2, glassTop, halfWall),
          at(side * width / 2, glassTop, screenDepth)],
        outward: normal(rear.yaw - side * Math.PI / 2, 1),
        uv: [[0, 0], [0.22, 0], [0.22, 1], [0, 1]],
      }]);
      box(mat.iron, side * ((width + opening) / 4 - 0.04), (sill + head) / 2, (screenDepth + halfWall) / 2,
        0.075, head - sill, 0.09);
    }
    for (let i = 0; i <= 9; i++) {
      const stoneMullion = i % 3 === 0;
      box(stoneMullion ? stone : mat.iron, (i / 9 - 0.5) * width, (sill + head) / 2, screenDepth + 0.04,
        stoneMullion ? 0.13 : 0.053, head - sill, 0.09);
    }
    for (const fraction of [0.25, 0.5, 0.75]) {
      const y = sill + fraction * (head - sill);
      box(mat.iron, 0, y, screenDepth + 0.045, width, 0.075, 0.09);
      for (const side of [-1, 1]) {
        const angle = rear.yaw + side * Math.atan2((opening - width) / 2, halfWall - screenDepth);
        mesh.box(mat.iron, at(side * (width + opening) / 4, y, (screenDepth + halfWall) / 2),
          0.075, 0.075, halfWall - screenDepth, angle);
      }
    }
    return;
  }
  for (let i = 0; i <= 3; i++) {
    const x = (i - 1.5) * bay;
    box(stone, x, (sill + head) / 2, screenDepth, 0.21, head - sill, 0.28);
    box(stone, x, sill + 0.125, screenDepth, 0.21, 0.25, 0.32);
  }
  for (const fraction of [0.18, 0.35, 0.52, 0.69]) {
    box(stone, 0, sill + fraction * (head - sill), screenDepth, width + 0.07, 0.13, 0.19);
  }
  for (let i = -1; i <= 1; i++) {
    const center = i * bay;
    const b = place(face, center, floor);
    const archFrame = { x: b.x, z: b.z, yaw: rear.yaw };
    const crown = { width: bay - 0.16, height: 0.91, sill: head - 1.04, spring: 0.25 };
    archWall(mesh, stone, archFrame, bay - 0.05, crown.sill, head, 0.21, crown);
    for (const side of [-1, 1]) archTrim(mesh, stone, archFrame, crown, 0.053, 0.108, side);
    const lightWidth = (bay - 0.16) / 3;
    const spring = head - 1.46;
    for (const side of [-1, 1]) {
      box(stone, center + side * lightWidth / 2, (sill + spring) / 2,
        screenDepth, 0.081, spring - sill, 0.135);
    }
    for (let j = -1; j <= 1; j++) {
      const a = place(archFrame, j * lightWidth, floor);
      const tracery = { x: a.x, z: a.z, yaw: rear.yaw };
      const light = { width: lightWidth - 0.05, sill: spring,
        height: j === 0 ? 0.69 : 0.5, spring: 0.33 };
      for (const side of [-1, 1]) archTrim(mesh, stone, tracery, light, 0.036, 0.044, side);
    }
  }

  const cap = head + 0.34;
  box(stone, 0, cap - 0.04, screenDepth - 0.06, width + 0.47, 0.19, 0.39);
  for (let i = -5; i <= 5; i++) {
    box(stone, i * 0.49, cap + 0.12, screenDepth - 0.16, 0.28, 0.23, 0.22);
  }
  const lip = width / 2 + 0.25;
  const tip = width * 0.19;
  const front = screenDepth - 0.2;
  const back = 0.015;
  const apex = cap + 1.36;
  const lowerLeft = at(-lip, cap, front);
  const lowerRight = at(lip, cap, front);
  const upperLeft = at(-tip, apex, back);
  const upperRight = at(tip, apex, back);
  mesh.surface(mat.slate, [
    { points: [lowerLeft, lowerRight, upperRight, upperLeft], outward: Vector3.Up() },
    { points: [lowerLeft, upperLeft, at(-lip, cap, back)], outward: Vector3.Up() },
    { points: [lowerRight, at(lip, cap, back), upperRight], outward: Vector3.Up() },
  ]);
}
