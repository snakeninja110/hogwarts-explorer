import { Mesh, Scene, Vector3, VertexData } from '@babylonjs/core';

export const TILE_METRES = 8;

export interface Face {
  points: Vector3[];
  outward: Vector3;
  uv?: readonly (readonly [number, number])[];
}

export interface Masonry<Material> {
  box(material: Material, center: Vector3, width: number, height: number, depth: number, yaw?: number): Mesh;
  surface(material: Material, faces: Face[]): void;
}

export interface Frame {
  x: number;
  z: number;
  yaw: number;
}

export function place({ x, z, yaw }: Frame, across: number, y: number, depth = 0): Vector3 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return new Vector3(x + across * cos + depth * sin, y, z - across * sin + depth * cos);
}

export function normal(yaw: number, side = -1): Vector3 {
  return new Vector3(Math.sin(yaw) * side, 0, Math.cos(yaw) * side);
}

export function masonryBox(
  scene: Scene, name: string, center: Vector3,
  width: number, height: number, depth: number, yaw = 0, roof = false,
): Mesh {
  const data = VertexData.CreateBox({ width, height, depth });
  const positions = data.positions!;
  const normals = data.normals!;
  const uvs: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const horizontal = normals[i + 1] !== 0;
    const alongDepth = normals[i] !== 0 || (horizontal && roof);
    const u = positions[i + (alongDepth ? 2 : 0)];
    const v = positions[i + (horizontal ? (alongDepth ? 0 : 2) : 1)];
    uvs.push(u / TILE_METRES, v / TILE_METRES);
  }
  data.uvs = uvs;
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  mesh.position.copyFrom(center);
  mesh.rotation.y = yaw;
  return mesh;
}

export function masonrySurface(scene: Scene, name: string, faces: Face[]): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const { points, outward, uv } of faces) {
    const start = positions.length / 3;
    const faceNormal = Vector3.Cross(points[1].subtract(points[0]), points[2].subtract(points[0])).normalize();
    const reverse = Vector3.Dot(faceNormal, outward) > 0;
    if (!reverse) faceNormal.negateInPlace();
    const horizontal = Math.abs(faceNormal.y) > Math.max(Math.abs(faceNormal.x), Math.abs(faceNormal.z));
    const side = !horizontal && Math.abs(faceNormal.x) > Math.abs(faceNormal.z);
    for (const [i, p] of points.entries()) {
      positions.push(p.x, p.y, p.z);
      normals.push(faceNormal.x, faceNormal.y, faceNormal.z);
      const customUV = uv?.[i];
      if (customUV) uvs.push(...customUV);
      else uvs.push((side ? p.z : p.x) / TILE_METRES, (horizontal ? p.z : p.y) / TILE_METRES);
    }
    for (let i = 1; i < points.length - 1; i++) {
      if (reverse) indices.push(start, start + i + 1, start + i);
      else indices.push(start, start + i, start + i + 1);
    }
  }

  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  Object.assign(data, { positions, normals, indices, uvs });
  data.applyToMesh(mesh);
  return mesh;
}
