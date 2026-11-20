import { Vector3 } from '@babylonjs/core';
import { normal, place, type Face, type Frame, type Masonry } from './Masonry';

export interface Arch {
  width: number;
  height: number;
  sill: number;
  spring?: number;
}

function crown({ width, height, sill, spring = 0.65 }: Arch): [number, number][] {
  return Array.from({ length: 17 }, (_, i) => {
    const distance = (i - 8) / 8;
    const t = 1 - Math.abs(distance);
    return [Math.sign(distance) * width / 2 * (1 - t * t), sill + height * (spring + (1 - spring) * t)];
  });
}

/** An arch profile swept through a set of stone mouldings, from the reveal to the façade. */
export function mouldedArch<M>(
  mesh: Masonry<M>, trim: M, frame: Frame, arch: Arch,
  section: ReadonlyArray<readonly [outset: number, depth: number]>,
): void {
  const outlines = section.map(([outset, depth]) => {
    const half = arch.width / 2 + outset;
    const profile = crown({ ...arch, width: 2 * half, height: arch.height + outset });
    return [[-half, arch.sill], ...profile, [half, arch.sill]].map(([x, y]) => place(frame, x, y, depth));
  });
  const outward = normal(frame.yaw);
  const faces: Face[] = [];
  for (let ring = 1; ring < outlines.length; ring++) {
    const inner = outlines[ring - 1];
    const outer = outlines[ring];
    for (let i = 1; i < inner.length; i++) {
      faces.push({ points: [inner[i - 1], inner[i], outer[i], outer[i - 1]], outward });
    }
  }
  mesh.surface(trim, faces);
}

/** The small projecting stone gable above a pointed entrance. */
export function gabledPortal<M>(
  mesh: Masonry<M>, stone: M, trim: M, frame: Frame, arch: Arch,
  half: number, eave: number, peak: number, depth: number,
): void {
  const roofAt = (x: number) => peak - (peak - eave) * Math.abs(x) / half;
  const profile = crown(arch);
  const faces: Face[] = [];
  for (const side of [-1, 1]) {
    const d = side * depth / 2;
    const outward = normal(frame.yaw, side);
    for (let i = 1; i < profile.length; i++) {
      const [a, ay] = profile[i - 1];
      const [b, by] = profile[i];
      faces.push({ points: [place(frame, a, ay, d), place(frame, b, by, d),
        place(frame, b, roofAt(b), d), place(frame, a, roofAt(a), d)], outward });
    }
    for (const edge of [-1, 1]) {
      const jamb = edge * arch.width / 2;
      const corner = edge * half;
      faces.push({ points: [place(frame, corner, arch.sill, d), place(frame, jamb, arch.sill, d),
        place(frame, jamb, roofAt(jamb), d), place(frame, corner, eave, d)], outward });
    }
  }
  for (let i = 1; i < profile.length; i++) {
    const [a, ay] = profile[i - 1];
    const [b, by] = profile[i];
    faces.push({ points: [place(frame, a, ay, -depth / 2), place(frame, b, by, -depth / 2),
      place(frame, b, by, depth / 2), place(frame, a, ay, depth / 2)], outward: Vector3.Down() });
  }
  mesh.surface(stone, faces);
  for (const side of [-1, 1]) {
    for (const [x, outward] of [[half, side], [arch.width / 2, -side]]) {
      const at = x * side;
      const top = x === half ? eave : profile[0][1];
      mesh.surface(stone, [{ points: [place(frame, at, arch.sill, -depth / 2), place(frame, at, arch.sill, depth / 2),
        place(frame, at, top, depth / 2), place(frame, at, top, -depth / 2)], outward: normal(frame.yaw + Math.PI / 2, outward) }]);
    }
    const cope = mesh.box(trim, place(frame, side * half / 2, (eave + peak) / 2),
      Math.hypot(half, peak - eave) + 0.1, 0.16, depth + 0.13, frame.yaw);
    cope.rotation.z = -side * Math.atan2(peak - eave, half);
  }
}

/** A bay of masonry with an open arch, including its stone soffit. */
export function archWall<M>(
  mesh: Masonry<M>, stone: M, frame: Frame,
  width: number, base: number, top: number, depth: number, arch: Arch,
): void {
  const pier = (width - arch.width) / 2;
  for (const side of [-1, 1]) {
    mesh.box(stone, place(frame, side * (width - pier) / 2, (base + top) / 2), pier, top - base, depth, frame.yaw);
  }
  if (arch.sill > base) {
    mesh.box(stone, place(frame, 0, (base + arch.sill) / 2), arch.width, arch.sill - base, depth, frame.yaw);
  }
  const profile = crown(arch);
  const faces: Face[] = [];
  for (let i = 1; i < profile.length; i++) {
    const [a, ay] = profile[i - 1];
    const [b, by] = profile[i];
    for (const side of [-1, 1]) {
      const d = side * depth / 2;
      faces.push({
        points: [place(frame, a, ay, d), place(frame, b, by, d), place(frame, b, top, d), place(frame, a, top, d)],
        outward: normal(frame.yaw, side),
      });
    }
    faces.push({
      points: [place(frame, a, ay, -depth / 2), place(frame, b, by, -depth / 2),
        place(frame, b, by, depth / 2), place(frame, a, ay, depth / 2)],
      outward: new Vector3(0, -1, 0),
    });
  }
  mesh.surface(stone, faces);
}

/** Pointed stone casing that can frame an empty portal or glazed opening. */
export function archTrim<M>(
  mesh: Masonry<M>, trim: M, frame: Frame, arch: Arch, band: number, depth: number, side: number,
): void {
  const inner = crown(arch);
  const outer = crown({ ...arch, width: arch.width + band * 2, height: arch.height + band });
  const faces = inner.slice(1).map((point, i) => ({
    points: [inner[i], point, outer[i + 1], outer[i]].map(([x, y]) => place(frame, x, y, side * depth)),
    outward: normal(frame.yaw, side),
  }));
  mesh.surface(trim, faces);
  const spring = inner[0][1];
  for (const edge of [-1, 1]) {
    mesh.box(trim, place(frame, edge * (arch.width + band) / 2, (arch.sill + spring) / 2, side * depth),
      band, spring - arch.sill, 0.15, frame.yaw);
  }
}

export function archPanel<M>(mesh: Masonry<M>, panel: M, frame: Frame, arch: Arch): void {
  const half = arch.width / 2;
  const profile = [[-half, arch.sill], [half, arch.sill], ...crown(arch).reverse()];
  mesh.surface(panel, [-1, 1].map(side => ({
    points: profile.map(([x, y]) => place(frame, x, y, side * 0.02)),
    outward: normal(frame.yaw, side),
    uv: profile.map(([x, y]) => [0.5 + x / arch.width, (y - arch.sill) / arch.height]),
  })));
}

export function lancetWindow<M>(
  mesh: Masonry<M>, trim: M, glass: M, frame: Frame, arch: Arch, wallDepth: number, lights = 1,
  mullion = trim, transom = true,
): void {
  archPanel(mesh, glass, frame, arch);
  for (const side of [-1, 1]) {
    const depth = wallDepth / 2 + 0.055;
    archTrim(mesh, trim, frame, arch, Math.min(0.23, arch.width * 0.12), depth, side);
    mesh.box(trim, place(frame, 0, arch.sill - 0.07, side * depth), arch.width + 0.32, 0.14, 0.25, frame.yaw);
  }
  for (let i = 1; i < lights; i++) {
    const x = arch.width * (i / lights - 0.5);
    mesh.box(mullion, place(frame, x, arch.sill + arch.height * 0.42), 0.105, arch.height * 0.84, wallDepth * 0.63, frame.yaw);
  }
  if (lights > 1 && transom) {
    mesh.box(mullion, place(frame, 0, arch.sill + arch.height * 0.46), arch.width, 0.13, wallDepth * 0.63, frame.yaw);
  }
}

export function gableWall<M>(
  mesh: Masonry<M>, stone: M, frame: Frame, width: number, eave: number, rise: number,
): void {
  const points = [place(frame, -width / 2, eave), place(frame, width / 2, eave), place(frame, 0, eave + rise)];
  mesh.surface(stone, [-1, 1].map(side => ({ points, outward: normal(frame.yaw, side) })));
}

export function buttress<M>(
  mesh: Masonry<M>, stone: M, trim: M, frame: Frame,
  base: number, height: number, width: number, projection: number,
): void {
  for (const [bottom, top, size] of [[0, 0.38, 1], [0.38, 0.74, 0.78], [0.74, 1, 0.55]]) {
    const depth = projection * size;
    mesh.box(stone, place(frame, 0, base + (bottom + top) * height / 2, -depth / 2),
      width * size, (top - bottom) * height, depth, frame.yaw);
    mesh.box(trim, place(frame, 0, base + top * height - 0.08, -depth / 2),
      width * size + 0.17, 0.18, depth + 0.16, frame.yaw);
  }
}

export function pinnacle<M>(mesh: Masonry<M>, stone: M, cap: M, frame: Frame, base: number, width: number, height: number): void {
  mesh.box(stone, place(frame, 0, base + height * 0.18), width, height * 0.36, width, frame.yaw);
  const rim = width * 0.63;
  mesh.box(stone, place(frame, 0, base + height * 0.34), rim * 2, height * 0.10, rim * 2, frame.yaw);
  const corners = [[-rim, -rim], [rim, -rim], [rim, rim], [-rim, rim]];
  const peak = place(frame, 0, base + height);
  mesh.surface(cap, corners.map(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % corners.length];
    return {
      points: [place(frame, x, base + height * 0.39, z), place(frame, nx, base + height * 0.39, nz), peak],
      outward: place(frame, x + nx, 1, z + nz).subtract(place(frame, 0, 0)),
    };
  }));
}

export function pinnacledButtress<M>(
  mesh: Masonry<M>, stone: M, trim: M, frame: Frame,
  base: number, height: number, width: number, projection: number, peak: number,
): void {
  buttress(mesh, stone, trim, frame, base, height, width, projection);
  const center = place(frame, 0, base + height, -projection * 0.275);
  const cap = { x: center.x, z: center.z, yaw: frame.yaw };
  const capWidth = width * 0.57;
  pinnacle(mesh, stone, trim, cap, center.y, capWidth, peak);
  for (const tier of [0.43, 0.56, 0.68, 0.79, 0.89]) {
    const edge = capWidth * 0.63 * (1 - (tier - 0.39) / 0.61);
    const carving = 0.085 + edge * 0.35;
    for (const x of [-edge, edge]) {
      for (const z of [-edge, edge]) {
        mesh.box(trim, place(cap, x, center.y + peak * tier, z), carving, carving * 0.72, carving, cap.yaw + Math.PI / 4);
      }
    }
  }
}
