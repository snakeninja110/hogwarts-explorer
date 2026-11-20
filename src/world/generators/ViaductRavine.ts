import { VIADUCT } from '../castleLayout';
import { place, type Masonry } from './Masonry';
import { rockTerrain } from './RockTerrain';

// Sections run from the lake mouth to the slope against the castle terrace.
// Heights are relative to the existing bridge deck and the lake.
const stations = [-0.44, -0.30, -0.18, -0.07, 0.035, 0.13, 0.25, 0.37, 0.49,
  0.60, 0.72, 0.84, 0.93, 1.01, 1.14, 1.24, 1.37, 1.49];
const sections = [
  { depth: -22, heights: [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4,
    -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4] },
  { depth: -15, heights: [-0.4, 3, 6, 7, 5, 2.8, 1.2, -0.1, -0.3,
    -0.1, 1.4, 3.9, 7, 9, 9.5, 7, 3, -0.4] },
  { depth: -10, heights: [-0.4, 11, 17, 18.5, 16, 10.5, 5.7, 2.3, 1.2,
    2.5, 6.1, 11, 17, 21, 24, 21, 10, -0.4] },
  { depth: -5, heights: [-0.4, 17, 28, 30.6, 23.8, 17.8, 10.2, 5.4, 4.3,
    5.2, 10.3, 15.8, 23, 30.9, 31.25, 29, 17, -0.4] },
  { depth: -1, heights: [-0.4, 21, 30.9, 31.45, 25.6, 18.7, 10.6, 6.7, 5.5,
    6.6, 9.6, 14.9, 24.1, 31.25, 31.38, 30.6, 21, -0.4] },
  { depth: 3.5, heights: [-0.4, 19, 31.15, 31.25, 29.2, 22.1, 13.1, 9.1, 7.2,
    8.8, 13.1, 19.4, 26, 31.35, 31.42, 30.8, 23.7, -0.4] },
  // The broken rock ledge at the retaining wall falls away before the bridge piers.
  { depth: 8, heights: [-0.4, 18, 30.5, 31.55, 31.2, 29.1, 21.4, 15.9, 12.6,
    14.5, 19.9, 24.8, 29.2, 31.5, 31.4, 30.1, 21.9, -0.4] },
  { depth: 10.5, heights: [-0.4, 17.4, 30.1, 31.55, 31.62, 30.9, 26.3, 21.1, 17.3,
    18.9, 23.8, 28.7, 30.2, 31.55, 31.37, 29.7, 19.6, -0.4] },
  { depth: 13, heights: [-0.4, 17, 29.3, 31.42, 31.61, 31.6, 30.2, 25.6, 22.7,
    23.5, 28.1, 30.9, 31.6, 31.6, 31.35, 28.8, 18, -0.4] },
  { depth: 18, heights: [-0.4, 15, 28.4, 31.6, 31.7, 31.7, 31.7, 31.45, 31.36,
    31.48, 31.7, 31.7, 31.7, 31.65, 31.4, 27.3, 12, -0.4] },
  { depth: 23, heights: [-0.4, 12, 22, 30.8, 31.15, 31.55, 31.4, 31.35, 31.1,
    31.2, 31.35, 31.3, 30.3, 28.2, 22, 14.5, 3.1, -0.4] },
  { depth: 30, heights: [-0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4,
    -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4, -0.4] },
];

// Outcrops in front of the retaining wall, measured in the bridge's local frame.
const outcrops = [
  { along: -0.015, depth: 6.7, span: 4.3, reach: 2.45, rise: 4.4 },
  { along: 0.20, depth: 10.6, span: 3.8, reach: 2.5, rise: 4.8 },
];

export function viaductRavine<M>(mesh: Masonry<M>, rock: M): void {
  const acrossSteps = 3;
  const depthSteps = 4;
  const columns = (stations.length - 1) * acrossSteps + 1;
  const rows = (sections.length - 1) * depthSteps + 1;
  const point = (row: number, column: number) => {
    const along = Math.min(Math.floor(column / acrossSteps), stations.length - 2);
    const section = Math.min(Math.floor(row / depthSteps), sections.length - 2);
    const a = (column - along * acrossSteps) / acrossSteps;
    const d = (row - section * depthSteps) / depthSteps;
    const mix = (from: number, to: number, fraction: number) => from + (to - from) * fraction;
    const x = mix(stations[along], stations[along + 1], a) * VIADUCT.length;
    const near = sections[section];
    const far = sections[section + 1];
    const z = mix(near.depth, far.depth, d);
    const base = mix(mix(near.heights[along], near.heights[along + 1], a),
      mix(far.heights[along], far.heights[along + 1], a), d);
    // Keep the crest below the bridgehead and let it break into the existing ravine surface.
    const uplift = outcrops.reduce((total, rock) => {
      const alongRock = (x - rock.along * VIADUCT.length) / rock.span;
      const acrossRock = (z - rock.depth) / rock.reach;
      const profile = Math.max(0, 1 - alongRock ** 2 - acrossRock ** 2);
      return total + rock.rise * profile ** 1.25;
    }, 0);
    const y = base + Math.min(uplift, Math.max(0, VIADUCT.deckY - 0.16 - base));
    const relief = Math.min(1, Math.max(0, (y - 0.35) / 4), Math.max(0, (VIADUCT.deckY - 0.55 - y) / 2.3));
    const bed = 0.73 * Math.sin(x * 0.93 + z * 0.74) + 0.33 * Math.cos(x * 2.47 - z * 1.65);
    const ledge = 0.79 * Math.sin(y * 0.78 + z * 0.19 + x * 0.21);
    return place(VIADUCT, x + relief * 0.27 * Math.sin(column * 2.4 + row * 0.8),
      y + relief * (bed + ledge), z + relief * 0.29 * Math.cos(column + row * 2.1));
  };

  const points = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => point(row, column)));
  // Offset the ravine base from the overlapping castle base to avoid z-fighting.
  rockTerrain(mesh, rock, points, -0.05);
}
