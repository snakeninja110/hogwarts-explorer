import { normal, place, type Face, type Frame, type Masonry } from './Masonry';

export function pitchedRoof<M>(
  mesh: Masonry<M>, slate: M, ridge: M, frame: Frame,
  width: number, length: number, eave: number, rise: number, overhang: number,
): void {
  const half = width / 2 + overhang;
  const span = length + overhang * 2;
  const slope = Math.atan2(rise, half);
  for (const side of [-1, 1]) {
    const panel = mesh.box(slate, place(frame, side * half / 2, eave + rise / 2),
      Math.hypot(half, rise), 0.26, span, frame.yaw);
    panel.rotation.z = -side * slope;
  }
  mesh.box(ridge, place(frame, 0, eave + rise + 0.09), 0.31, 0.24, span + 0.12, frame.yaw);
}

type Ring = readonly [height: number, radius: number];

/** Join horizontal rings to form a turret wall, an eave, or a tapering roof. */
export function radialProfile<M>(mesh: Masonry<M>, frame: Frame, sides: number, startAngle = 0) {
  const step = 2 * Math.PI / sides;
  const angle = (i: number) => startAngle + i * step;
  const angles = Array.from({ length: sides }, (_, i) => angle(i));
  const point = (angle: number, height: number, radius: number) =>
    place(frame, radius * Math.cos(angle), height, radius * Math.sin(angle));

  function panel(i: number, [low, lowerR]: Ring, [high, upperR]: Ring): Face {
    const a = angles[i], b = angles[(i + 1) % sides];
    return {
      points: [point(a, low, lowerR), point(b, low, lowerR), point(b, high, upperR), point(a, high, upperR)],
      outward: normal(frame.yaw + Math.PI / 2 - (a + step / 2), 1),
    };
  }

  function band(material: M, lower: Ring, upper: Ring): void {
    mesh.surface(material, angles.map((_, i) => panel(i, lower, upper)));
  }

  return { angle, point, panel, band };
}

/** Slender octagonal shaft and slate spire, with a projecting eave and finial. */
export function roofSpire<M>(
  mesh: Masonry<M>, mat: { shaft: M; trim: M; slate: M; iron: M }, frame: Frame,
  base: number, size: { radius: number; shaft: number; cap: number },
): void {
  const { radius, shaft, cap } = size;
  const eave = base + shaft;
  const { band } = radialProfile(mesh, frame, 8, Math.PI / 8);
  band(mat.trim, [base, radius * 0.42], [base + 0.72, radius]);
  band(mat.shaft, [base + 0.72, radius], [eave - 0.27, radius]);
  band(mat.trim, [eave - 0.27, radius], [eave - 0.08, radius * 1.15]);
  band(mat.trim, [eave - 0.08, radius * 1.15], [eave, radius * 1.15]);
  band(mat.slate, [eave, radius * 1.15], [eave + cap * 0.13, radius * 0.91]);
  band(mat.slate, [eave + cap * 0.13, radius * 0.91], [eave + cap, 0.025]);
  mesh.box(mat.iron, place(frame, 0, eave + cap + 0.19), 0.058, 0.48, 0.058, frame.yaw);
}
