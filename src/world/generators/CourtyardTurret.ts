import { Vector3 } from '@babylonjs/core';
import { CASTLE_APPROACH, COURTYARD_TURRET } from '../castleLayout';
import type { HallMaterials } from './GreatHallArchitecture';
import type { Face, Masonry } from './Masonry';
import { radialProfile } from './RoofParts';

export function courtyardTurret<M>(mesh: Masonry<M>, mat: HallMaterials<M>): void {
  const { x, z, radius, base, eave, roofRise } = COURTYARD_TURRET;
  const floor = CASTLE_APPROACH.floorY;
  const sides = 64;
  const { angle, point, panel, band } = radialProfile(mesh, { x, z, yaw: 0 }, sides);

  band(mat.stone, [base, radius * 0.94], [floor - 3.1, radius]);
  const masonry: Face[] = [];
  const slots: Face[] = [];
  const dressing: Face[] = [];
  // Omit a section of the cylinder at each slit and build the actual recess.
  const lowerSlits = [35, 49];
  const upperSlits = [16, 29, 44, 56];
  for (let i = 0; i < sides; i++) {
    const lower = lowerSlits.includes(i);
    const upper = upperSlits.includes(i);
    if (!lower && !upper) {
      masonry.push(panel(i, [floor - 3.1, radius], [eave - 0.11, radius]));
      continue;
    }
    const sill = floor + (lower ? -0.6 : 3.68);
    const head = sill + (lower ? 0.73 : 0.82);
    const inset = radius - 0.24;
    const left = angle(i), right = angle(i + 1);
    masonry.push(panel(i, [floor - 3.1, radius], [sill, radius]), panel(i, [head, radius], [eave - 0.11, radius]));
    slots.push(panel(i, [sill, inset], [head, inset]));
    for (const [edge, side] of [[left, 1], [right, -1]]) {
      masonry.push({ points: [point(edge, sill, inset), point(edge, sill, radius),
        point(edge, head, radius), point(edge, head, inset)],
        outward: new Vector3(-Math.sin(edge) * side, 0, Math.cos(edge) * side) });
    }
    for (const [y, side] of [[sill, 1], [head, -1]]) {
      masonry.push({ points: [point(left, y, inset), point(right, y, inset),
        point(right, y, radius), point(left, y, radius)], outward: new Vector3(0, side, 0) });
    }
    const a = (left + right) / 2;
    const sillYaw = Math.PI / 2 - a;
    mesh.box(mat.trim, point(a, sill - 0.045, radius + 0.025), 0.35, 0.1, 0.23, sillYaw);
    dressing.push(panel(i, [head, radius + 0.032], [head + 0.085, radius + 0.032]));
  }
  mesh.surface(mat.stone, masonry);
  mesh.surface(mat.iron, slots);
  mesh.surface(mat.trim, dressing);

  band(mat.stone, [eave - 0.13, radius], [eave, radius + 0.06]);
  const lip = radius + 0.23;
  band(mat.slate, [eave - 0.015, lip], [eave + 0.10, lip]);
  band(mat.slate, [eave + 0.10, lip], [eave + roofRise * 0.22, lip * 0.78]);
  band(mat.slate, [eave + roofRise * 0.22, lip * 0.78], [eave + roofRise, 0.13]);
  const tip = eave + roofRise;
  band(mat.trim, [tip - 0.05, 0.15], [tip + 0.12, 0.15]);
  band(mat.iron, [tip + 0.10, 0.095], [tip + 0.62, 0.022]);
}
