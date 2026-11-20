import { place, type Frame, type Masonry } from './Masonry';

type StairPoint = { x: number; y: number; z: number };

export function stairRun(bottom: StairPoint, top: StairPoint, width: number, steps: number) {
  const dx = top.x - bottom.x;
  const dz = top.z - bottom.z;
  const frame: Frame = { x: bottom.x, z: bottom.z, yaw: Math.atan2(dx, dz) };
  const length = Math.hypot(dx, dz);
  const rise = top.y - bottom.y;
  const slopeLength = Math.hypot(length, rise);
  return {
    frame, width, steps, length, rise, base: bottom.y,
    angle: -Math.atan2(rise, length),
    slopeLength,
    center: place(frame, 0, bottom.y + rise / 2, length / 2),
  };
}

export type StairRun = ReturnType<typeof stairRun>;

export function stoneStairs<M>(mesh: Masonry<M>, stone: M, trim: M, run: StairRun): void {
  const { frame, base, length, rise, width, steps, angle, slopeLength, center } = run;
  const slab = mesh.box(stone, center.clone().addInPlaceFromFloats(0, -0.23, 0), width, 0.46, slopeLength, frame.yaw);
  slab.rotation.x = angle;
  if (steps > 0) {
    const tread = length / steps;
    const riser = rise / steps;
    for (let i = 0; i < steps; i++) {
      const at = place(frame, 0, base + (i + 1) * riser - 0.15, (i + 0.5) * tread);
      mesh.box(stone, at, width, 0.3, tread + 0.008, frame.yaw);
      mesh.box(trim, at.clone().addInPlaceFromFloats(0, 0.13, 0), width + 0.025, 0.04, tread + 0.04, frame.yaw);
    }
  }
}
