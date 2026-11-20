import { Vector3 } from '@babylonjs/core';
import { CASTLE_APPROACH, GREAT_HALL, HALL_TOWER_LINK, MAIN_TOWER, QUAD_TOWERS, STAIRCASE_QUAD, WALL_DEPTH } from '../castleLayout';
import type { HallMaterials } from './GreatHallArchitecture';
import { archWall, gableWall, lancetWindow } from './GothicParts';
import { normal, place, TILE_METRES, type Face, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, radialProfile } from './RoofParts';

const UP = Vector3.Up();
const officeAngle = Math.PI * 0.74;
type Ring = readonly [height: number, radius: number];

/** Keep stone courses and slate aligned around the tower circumference. */
function towerProfile<M>(mesh: Masonry<M>, frame: Frame, sides: number, textureRadius: number) {
  const profile = radialProfile(mesh, frame, sides);
  const uStep = Math.PI * 2 * textureRadius / (sides * TILE_METRES);
  function panel(i: number, lower: Ring, upper: Ring): Face {
    const u = i * uStep;
    const next = u + uStep;
    const low = lower[0] / TILE_METRES;
    const high = upper[0] / TILE_METRES;
    return { ...profile.panel(i, lower, upper), uv: [[u, low], [next, low], [next, high], [u, high]] };
  }
  function band(material: M, lower: Ring, upper: Ring): void {
    mesh.surface(material, Array.from({ length: sides }, (_, i) => panel(i, lower, upper)));
  }
  return { ...profile, panel, band };
}

/** Cut the lights into the curved wall, with dark panes behind stone reveals. */
function windowedDrum<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, lower: Ring, upper: Ring,
  sills: readonly number[], height: number, columns: number, segmentsPerColumn: number,
): void {
  const sides = columns * segmentsPerColumn;
  const { point, angle, panel } = towerProfile(mesh, frame, sides, lower[1]);
  const radius = (y: number) => lower[1] + (upper[1] - lower[1]) * (y - lower[0]) / (upper[0] - lower[0]);
  const offset = Math.floor(segmentsPerColumn / 2);
  const stone: Face[] = [];
  const reveals: Face[] = [];
  const panes: Face[] = [];
  for (let i = 0; i < sides; i++) {
    if (i % segmentsPerColumn !== offset) {
      stone.push(panel(i, lower, upper));
      continue;
    }
    let bottom = lower[0];
    const a = angle(i), b = angle(i + 1), mid = (a + b) / 2;
    const yaw = Math.PI / 2 - mid;
    for (const sill of sills) {
      const head = sill + height;
      const lowR = radius(sill), highR = radius(head);
      const inset = Math.min(0.3, lower[1] * 0.19);
      stone.push(panel(i, [bottom, radius(bottom)], [sill, lowR]));
      panes.push(panel(i, [sill, lowR - inset], [head, highR - inset]));
      for (const [edge, side] of [[a, 1], [b, -1]]) {
        reveals.push({
          points: [point(edge, sill, lowR), point(edge, sill, lowR - inset),
            point(edge, head, highR - inset), point(edge, head, highR)],
          outward: new Vector3(-Math.sin(edge) * side, 0, Math.cos(edge) * side),
        });
      }
      for (const [y, r, side] of [[sill, lowR, 1], [head, highR, -1]]) {
        reveals.push({
          points: [point(a, y, r), point(b, y, r), point(b, y, r - inset), point(a, y, r - inset)],
          outward: UP.scale(side),
        });
      }
      mesh.box(mat.trim, point(mid, sill - 0.045, lowR + 0.035),
        2 * lowR * Math.sin(Math.PI / sides) + 0.13, 0.095, 0.26, yaw);
      bottom = head;
    }
    stone.push(panel(i, [bottom, radius(bottom)], upper));
  }
  mesh.surface(mat.stone, stone);
  mesh.surface(mat.trim, reveals);
  mesh.surface(mat.iron, panes);
}

function corbelCourse<M>(
  mesh: Masonry<M>, stone: M, center: Frame, radius: number, base: number,
  height: number, projection: number, count: number,
): void {
  const faces: Face[] = [];
  for (let i = 0; i < count; i++) {
    const yaw = (i + 0.5) * Math.PI * 2 / count;
    const outer = normal(yaw, 1);
    const section = { ...center, yaw };
    const steps = [[0, 0.24, 0.16], [0.43, 0.43, 0.44], [0.76, 0.62, 0.83], [1, 0.64, 1]];
    const edge = (j: number, side: number, front: boolean) => {
      const [y, w, d] = steps[j];
      return place(section, side * w * height / 2, base + y * height,
        radius + (front ? d * projection : -0.23));
    };
    for (let j = 0; j < steps.length - 1; j++) {
      faces.push({ points: [edge(j, -1, true), edge(j, 1, true), edge(j + 1, 1, true), edge(j + 1, -1, true)], outward: outer });
      for (const side of [-1, 1]) {
        faces.push({
          points: [edge(j, side, false), edge(j, side, true), edge(j + 1, side, true), edge(j + 1, side, false)],
          outward: normal(yaw + Math.PI / 2, side),
        });
      }
    }
  }
  mesh.surface(stone, faces);
}

/** The Marble Staircase drum and the three offset turrets of the Headmaster's Office. */
export function mainTower<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { base, floor, radius, roofBase, roofRise } = MAIN_TOWER;
  const frame = { x: MAIN_TOWER.x, z: MAIN_TOWER.z, yaw: 0 };
  const r = radius;
  const { band } = towerProfile(mesh, frame, 108, r);
  const belt = floor + 14.5;
  const corbels = floor + 31.25;
  band(mat.stone, [base, r + 0.55], [floor + 0.35, r + 0.19]);
  band(mat.trim, [floor + 0.35, r + 0.25], [floor + 0.67, r + 0.16]);
  windowedDrum(mesh, mat, frame, [floor + 0.67, r + 0.15], [belt - 0.19, r - 0.44],
    [floor + 7.8, floor + 12.9], 0.81, 18, 6);
  corbelCourse(mesh, mat.trim, frame, r - 0.53, belt - 1.29, 0.99, 0.53, 34);
  band(mat.trim, [belt - 0.19, r - 0.43], [belt + 0.04, r - 0.06]);
  band(mat.trim, [belt + 0.04, r - 0.06], [belt + 0.18, r - 0.37]);
  windowedDrum(mesh, mat, frame, [belt + 0.18, r - 0.44], [corbels + 1.14, r],
    [16.45, 19.8, 23.1, 25.65, 28.0, 30.4].map(y => floor + y), 0.8, 18, 6);
  corbelCourse(mesh, mat.trim, frame, r - 0.12, corbels, 1.14, 0.91, 40);
  band(mat.trim, [corbels + 1.09, r - 0.01], [corbels + 1.14, r + 0.79]);
  band(mat.trim, [corbels + 1.14, r + 0.79], [corbels + 1.4, r + 0.72]);
  windowedDrum(mesh, mat, frame, [corbels + 1.4, r + 0.72], [roofBase - 0.46, r + 0.66],
    [roofBase - 2.25], 0.63, 12, 8);
  band(mat.trim, [roofBase - 0.46, r + 0.66], [roofBase - 0.23, r + 0.99]);
  band(mat.trim, [roofBase - 0.23, r + 0.99], [roofBase, r + 0.97]);

  const roof: Ring[] = [
    [roofBase, r + 1.19], [roofBase + 0.65, r + 0.88], [roofBase + roofRise * 0.22, r * 0.82],
    [roofBase + roofRise * 0.52, r * 0.50], [roofBase + roofRise * 0.81, r * 0.195],
    [roofBase + roofRise, 0.17],
  ];
  const roofBand = towerProfile(mesh, frame, 24, r + 1.19).band;
  roofBand(mat.slate, [roofBase - 0.07, r + 0.95], roof[0]);
  for (let i = 1; i < roof.length; i++) roofBand(mat.slate, roof[i - 1], roof[i]);
  const peak = roofBase + roofRise;
  band(mat.trim, [peak - 0.25, 0.26], [peak + 0.11, 0.22]);
  band(mat.iron, [peak, 0.095], [peak + 2.05, 0.02]);
  mesh.box(mat.iron, place(frame, 0, peak + 1.07), 0.58, 0.08, 0.11, Math.PI / 8);
  towerDormers(mesh, mat, frame, roof);
  officeTurrets(mesh, mat, frame, roofBase);
}

function towerDormers<M>(mesh: Masonry<M>, mat: HallMaterials<M>, tower: Frame, roof: readonly Ring[]): void {
  const slate: Face[] = [], frames: Face[] = [], panes: Face[] = [];
  for (let row = 0; row < 8; row++) {
    const sill = roof[0][0] + 2.25 + row * 2.63;
    const next = roof.findIndex(([height]) => height > sill);
    const [lo, r1] = roof[next - 1];
    const [hi, r2] = roof[next];
    const radius = r1 + (r2 - r1) * (sill - lo) / (hi - lo);
    for (let column = 0; column < 12; column++) {
      const a = (column + 0.14) * Math.PI / 6;
      const fromOffice = Math.atan2(Math.sin(a - officeAngle), Math.cos(a - officeAngle));
      if (row >= 3 && Math.abs(fromOffice) < 0.42) continue;
      const yaw = Math.PI / 2 - a;
      const point = place({ ...tower, yaw }, 0, sill, radius - 0.035);
      const frame = { x: point.x, z: point.z, yaw };
      const front = 0.30;
      const ring = (width: number, bottom: number, spring: number, tip: number, depth: number) =>
        [[-width, bottom], [width, bottom], [width, spring], [0, tip], [-width, spring]]
          .map(([x, y]) => place(frame, x, sill + y, depth));
      const outer = ring(0.36, 0, 0.63, 0.94, front);
      const inner = ring(0.22, 0.095, 0.56, 0.735, front);
      const back = ring(0.36, 0, 0.63, 0.94, -0.64);
      panes.push({ points: inner.map(p => p.subtract(normal(yaw, 1).scale(0.008))), outward: normal(yaw, 1) });
      for (let i = 0; i < 5; i++) {
        const j = (i + 1) % 5;
        frames.push({ points: [outer[i], outer[j], inner[j], inner[i]], outward: normal(yaw, 1) });
        if (i === 0) continue;
        const outward = i === 2 || i === 3 ? UP : normal(yaw + Math.PI / 2, i === 1 ? 1 : -1);
        slate.push({ points: [outer[i], back[i], back[j], outer[j]], outward });
      }
    }
  }
  mesh.surface(mat.slate, slate);
  mesh.surface(mat.trim, frames);
  mesh.surface(mat.iron, panes);
}

function officeTurrets<M>(mesh: Masonry<M>, mat: HallMaterials<M>, tower: Frame, eave: number): void {
  const axis = { ...tower, yaw: Math.PI / 2 - officeAngle };
  const groupY = eave + 1;
  // Numbered from the outside in. Turret 3 keeps its eave above the main roof and joins it lower down.
  const turrets = [
    { distance: 8.13, offset: 0.23, base: 16.16, radius: 0.94, eave: 21.18, rise: 4.02, corbel: true },
    { distance: 6.89, offset: 0.08, base: 14.75, radius: 1.11, eave: 20.02, rise: 3.95, corbel: true },
    { distance: 5.68, offset: -0.30, base: 11.55, radius: 1.23, eave: 18.60, rise: 3.94, corbel: false },
  ];
  for (const turret of turrets) {
    const p = place(axis, turret.offset, 0, turret.distance);
    const frame = { x: p.x, z: p.z, yaw: 0 };
    const r = turret.radius;
    const base = groupY + turret.base;
    const roof = groupY + turret.eave;
    const peak = roof + turret.rise;
    const sides = 32;
    const { band, point, angle } = towerProfile(mesh, frame, sides, r);
    if (turret.corbel) {
      const courses: Ring[] = [
        [base - 1.36, r * 0.30], [base - 1.12, r * 0.50], [base - 0.94, r * 0.50],
        [base - 0.80, r * 0.68], [base - 0.62, r * 0.68], [base - 0.48, r * 0.85],
        [base - 0.30, r * 0.85], [base - 0.16, r * 1.03], [base, r],
      ];
      for (let i = 1; i < courses.length; i++) band(mat.stone, courses[i - 1], courses[i]);
      const [toe, toeRadius] = courses[0];
      mesh.surface(mat.stone, [{
        points: Array.from({ length: sides }, (_, i) => point(angle(i), toe, toeRadius)),
        outward: UP.negate(),
      }]);
    } else {
      band(mat.stone, [base - 4, r * 0.63], [base, r]);
    }
    windowedDrum(mesh, mat, frame, [base, r], [roof - 0.18, r], [roof - 1.65], 0.76, 4, 8);
    band(mat.trim, [roof - 0.18, r], [roof - 0.07, r * 1.06]);
    band(mat.slate, [roof - 0.07, r * 1.06], [roof, r * 1.14]);
    band(mat.slate, [roof, r * 1.14], [roof + turret.rise * 0.16, r * 0.91]);
    band(mat.slate, [roof + turret.rise * 0.16, r * 0.91], [peak, 0.045]);
    band(mat.iron, [peak - 0.04, 0.06], [peak + 0.50, 0.012]);
  }
}

function quadTowerFrame({ across, depth }: { across: number; depth: number }): Frame {
  const { x, z } = place(STAIRCASE_QUAD, across, 0, depth);
  return { x, z, yaw: 0 };
}

function quadTowerDormer<M>(mesh: Masonry<M>, mat: HallMaterials<M>, tower: Frame, y: number, radius: number, width: number): void {
  const front = place(tower, 0, y, radius);
  const frame = { ...tower, x: front.x, z: front.z };
  const shoulder = y + width * 1.49;
  const arch = { width: width * 0.565, height: width * 1.15, sill: y + width * 0.105 };
  archWall(mesh, mat.stone, frame, width, y, shoulder, 0.31, arch);
  lancetWindow(mesh, mat.trim, mat.iron, frame, arch, 0.31);
  gableWall(mesh, mat.stone, frame, width, shoulder, width * 0.43);
  for (const side of [-1, 1]) {
    mesh.box(mat.stone, place(frame, side * (width / 2 - 0.055), (y + shoulder) / 2, -width * 0.45),
      0.11, shoulder - y, width * 1.03, frame.yaw);
  }
  const ridge = place(frame, 0, 0, -width * 0.5);
  pitchedRoof(mesh, mat.slate, mat.trim, { ...frame, x: ridge.x, z: ridge.z },
    width * 1.05, width * 1.23, shoulder - 0.01, width * 0.48, 0.06);
}

/** The two round corner towers on either side of Gryffindor Tower. */
export function quadFlankTowers<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { floor } = STAIRCASE_QUAD;
  for (const [name, tower] of Object.entries({ stoneBridge: QUAD_TOWERS.stoneBridge, north: QUAD_TOWERS.north })) {
    const frame = quadTowerFrame(tower);
    const r = tower.radius;
    const eave = floor + tower.eave;
    const stoneBridge = name === 'stoneBridge';
    const cornice = eave - (stoneBridge ? 4.35 : 4.95);
    const { band } = towerProfile(mesh, frame, 56, r);
    band(mat.stone, [floor + tower.base, r + 0.44], [floor + 0.38, r]);
    windowedDrum(mesh, mat, frame, [floor + 0.38, r], [cornice, r - 0.17],
      [floor + 3.3, floor + 7.1, floor + 11.05], 1.12, 8, 7);
    const projection = stoneBridge ? 0.37 : 0.55;
    corbelCourse(mesh, mat.stone, frame, r - 0.18, cornice - 0.95, 0.95, projection, stoneBridge ? 22 : 26);
    band(mat.trim, [cornice, r - 0.17], [cornice + 0.14, r + projection - 0.13]);
    windowedDrum(mesh, mat, frame, [cornice + 0.14, r + projection - 0.13], [eave - 0.21, r + projection - 0.15],
      [eave - 2.46], 1.05, 8, 7);
    band(mat.trim, [eave - 0.21, r + projection - 0.15], [eave, r + projection + 0.05]);
    const roofR = r + projection + 0.20;
    const peak = eave + tower.rise;
    const roof = towerProfile(mesh, frame, stoneBridge ? 24 : 40, roofR).band;
    roof(mat.slate, [eave - 0.06, r + projection - 0.12], [eave, roofR]);
    roof(mat.slate, [eave, roofR], [eave + tower.rise * 0.15, roofR * 0.78]);
    roof(mat.slate, [eave + tower.rise * 0.15, roofR * 0.78], [peak, 0.065]);
    band(mat.iron, [peak - 0.06, 0.07], [peak + 0.89, 0.012]);
    if (stoneBridge) {
      const lakeFace = { ...frame, yaw: STAIRCASE_QUAD.yaw + Math.PI };
      for (const [fraction, width] of [[0.19, 0.78], [0.34, 0.61], [0.49, 0.44]]) {
        const roofRadius = roofR * (0.78 * (1 - fraction) / 0.85);
        quadTowerDormer(mesh, mat, lakeFace, eave + tower.rise * fraction, roofRadius + 0.04, width);
      }
    }
  }

  // A narrower staircase turret starts on corbels next to the stone bridge tower.
  const stone = QUAD_TOWERS.stoneBridge;
  const turret = quadTowerFrame({ across: stone.across + 2.8, depth: stone.depth + 2.35 });
  const r = 1.12;
  const toe = floor + 10.4;
  const eave = floor + 28.65;
  const peak = eave + 10.6;
  const { band } = towerProfile(mesh, turret, 32, r);
  band(mat.stone, [toe - 1.28, r * 0.28], [toe - 0.46, r * 0.83]);
  band(mat.trim, [toe - 0.46, r * 0.83], [toe, r]);
  windowedDrum(mesh, mat, turret, [toe, r], [eave - 0.16, r * 0.98],
    [toe + 6.1, toe + 12.7, eave - 3.1], 0.77, 4, 8);
  band(mat.trim, [eave - 0.16, r * 0.98], [eave, r * 1.13]);
  band(mat.slate, [eave, r * 1.18], [eave + 2.2, r * 0.83]);
  band(mat.slate, [eave + 2.2, r * 0.83], [peak, 0.035]);
  band(mat.iron, [peak - 0.02, 0.04], [peak + 0.67, 0.012]);
}

/** The round dormitory tower at the corner opposite the marble staircase. */
export function gryffindorTower<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { floor } = STAIRCASE_QUAD;
  const tower = QUAD_TOWERS.gryffindor;
  const frame = quadTowerFrame(tower);
  const r = tower.radius;
  const crown = floor + 17.35;
  const eave = floor + tower.eave;
  const { band } = towerProfile(mesh, frame, 80, r);
  band(mat.stone, [floor + tower.base, r + 0.38], [floor + 0.34, r + 0.20]);
  band(mat.trim, [floor + 0.34, r + 0.20], [floor + 0.58, r + 0.09]);
  windowedDrum(mesh, mat, frame, [floor + 0.58, r + 0.08], [floor + 10.45, r - 0.16],
    [floor + 3.65, floor + 7.8], 1.42, 10, 8);
  band(mat.trim, [floor + 10.45, r - 0.16], [floor + 10.61, r + 0.05]);
  band(mat.trim, [floor + 10.61, r + 0.05], [floor + 10.79, r - 0.15]);
  windowedDrum(mesh, mat, frame, [floor + 10.79, r - 0.15], [crown, r - 0.03],
    [floor + 13.8], 1.63, 10, 8);
  corbelCourse(mesh, mat.stone, frame, r - 0.06, crown - 1.28, 1.28, 0.73, 28);
  band(mat.trim, [crown, r - 0.03], [crown + 0.18, r + 0.66]);
  band(mat.trim, [crown + 0.18, r + 0.66], [crown + 0.39, r + 0.59]);
  windowedDrum(mesh, mat, frame, [crown + 0.39, r + 0.59], [eave - 0.38, r + 0.54],
    [crown + 2.16, crown + 4.03], 1.05, 10, 8);
  band(mat.trim, [eave - 0.38, r + 0.54], [eave - 0.17, r + 0.76]);
  band(mat.trim, [eave - 0.17, r + 0.76], [eave, r + 0.76]);
  const peak = eave + tower.rise;
  const roof: Ring[] = [[eave, r + 0.85], [eave + 0.8, r + 0.48], [eave + 4.8, 3.57],
    [eave + 12.95, 1.29], [peak, 0.07]];
  band(mat.slate, [eave - 0.05, r + 0.76], roof[0]);
  for (let i = 1; i < roof.length; i++) band(mat.slate, roof[i - 1], roof[i]);
  band(mat.trim, [peak - 0.15, 0.15], [peak + 0.25, 0.092]);
  band(mat.iron, [peak + 0.23, 0.075], [peak + 1.35, 0.016]);

  quadTowerDormer(mesh, mat, { ...frame, yaw: STAIRCASE_QUAD.yaw }, eave + 0.22, r + 0.67, 1.24);
}

/** Low cross wing from the clock façade's right shoulder into the round tower. */
export function hallTowerLink<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { west, east, front, back, floor, eave, rise } = HALL_TOWER_LINK;
  const center = (west + east) / 2;
  const z = (front + back) / 2;
  const depth = 0.46;
  const trim = mat.portalTrim ?? mat.trim;
  const frontFrame = { x: center, z: front, yaw: 0 };
  const window = { width: 1.34, height: 3.73, sill: floor + 3.75, spring: 0.78 };
  archWall(mesh, mat.stone, frontFrame, east - west, floor, eave, depth, window);
  lancetWindow(mesh, trim, mat.iron, frontFrame, window, depth);
  for (const y of [1.06, 2.22]) {
    mesh.box(trim, place(frontFrame, 0, window.sill + y, -0.254), 1.39, 0.112, 0.15);
  }
  const backStart = CASTLE_APPROACH.x + GREAT_HALL.width / 2 + WALL_DEPTH / 2 - 0.08;
  const span = (east - backStart) / 2;
  for (const i of [0, 1]) {
    const frame = { x: backStart + (i + 0.5) * span, z: back, yaw: Math.PI };
    const lower = { width: 0.89, height: 2.13, sill: floor + 1.31, spring: 0.72 };
    const upper = { width: 1.12, height: 2.97, sill: floor + 4.45, spring: 0.76 };
    archWall(mesh, mat.stone, frame, span, floor, floor + 4.08, depth, lower);
    archWall(mesh, mat.stone, frame, span, floor + 4.08, eave, depth, upper);
    lancetWindow(mesh, trim, mat.iron, frame, lower, depth);
    lancetWindow(mesh, trim, mat.iron, frame, upper, depth, 2);
  }
  mesh.box(mat.stone, new Vector3((west + backStart) / 2, (floor + eave) / 2, back),
    backStart - west, eave - floor, depth);
  for (const x of [west, east]) {
    mesh.box(mat.stone, new Vector3(x, (floor + eave) / 2, z), depth, eave - floor, back - front);
    gableWall(mesh, mat.stone, { x, z, yaw: Math.PI / 2 }, back - front + depth, eave, rise);
  }
  for (const [sideZ, face] of [[front, -1], [back, 1]]) {
    for (const [y, h, width] of [[floor + 0.68, 0.20, 0.63], [eave - 0.12, 0.23, 0.68]]) {
      mesh.box(trim, new Vector3(center, y, sideZ + face * 0.05), east - west + 0.12, h, width);
    }
  }
  mesh.box(mat.stone, new Vector3(center, floor - 0.37, z), east - west + 0.52, 0.75, back - front + depth);
  pitchedRoof(mesh, mat.slate, mat.slate, { x: center, z, yaw: Math.PI / 2 },
    back - front + depth, east - west, eave + 0.05, rise, 0.18);
}
