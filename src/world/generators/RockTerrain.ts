import { Vector3 } from '@babylonjs/core';
import type { Face, Masonry } from './Masonry';

/** Close a terrain heightfield at its base, including any raised edges of the grid. */
export function rockTerrain<M>(mesh: Pick<Masonry<M>, 'surface'>, rock: M, grid: Vector3[][], base = 0): void {
  const up = Vector3.Up();
  const down = Vector3.Down();
  const faces: Face[] = [];
  const flatten = ({ x, z }: Vector3) => new Vector3(x, base, z);
  const intersection = (a: Vector3, b: Vector3) => {
    const [low, high] = a.y < b.y ? [a, b] : [b, a];
    return flatten(Vector3.Lerp(low, high, (base - low.y) / (high.y - low.y)));
  };

  function addTriangle(triangle: Vector3[]): void {
    if (triangle.every(point => point.y <= base)) return;
    const points: Vector3[] = [];
    for (const [i, a] of triangle.entries()) {
      const b = triangle[(i + 1) % triangle.length];
      if (a.y >= base) points.push(a);
      if ((a.y < base && b.y > base) || (a.y > base && b.y < base)) {
        points.push(intersection(a, b));
      }
    }
    faces.push({ points, outward: up }, { points: points.map(flatten), outward: down });
  }

  const lastRow = grid.length - 1;
  const lastColumn = grid[0].length - 1;
  for (let row = 0; row < lastRow; row++) {
    for (let column = 0; column < lastColumn; column++) {
      const a = grid[row][column];
      const b = grid[row + 1][column];
      const c = grid[row + 1][column + 1];
      const d = grid[row][column + 1];
      addTriangle([a, b, d]);
      addTriangle([b, c, d]);
    }
  }

  const edge = [
    ...grid[0],
    ...grid.slice(1).map(row => row[lastColumn]),
    ...grid[lastRow].slice(0, lastColumn).reverse(),
    ...grid.slice(1, lastRow).reverse().map(row => row[0]),
  ];
  const winding = Math.sign(edge.reduce((sum, a, i) => {
    const b = edge[(i + 1) % edge.length];
    return sum + a.x * b.z - b.x * a.z;
  }, 0));
  for (const [i, a] of edge.entries()) {
    const b = edge[(i + 1) % edge.length];
    if (a.y <= base && b.y <= base) continue;
    const left = a.y < base ? intersection(a, b) : a;
    const right = b.y < base ? intersection(a, b) : b;
    const outward = new Vector3(b.z - a.z, 0, a.x - b.x).scaleInPlace(winding);
    const points = [flatten(left), flatten(right)];
    if (right.y > base) points.push(right);
    if (left.y > base) points.push(left);
    faces.push({ points, outward });
  }
  mesh.surface(rock, faces);
}
