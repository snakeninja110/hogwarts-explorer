import { GREAT_HALL, WALL_DEPTH } from '../castleLayout';
import { archWall, gableWall, lancetWindow, pinnacledButtress } from './GothicParts';
import { greatHallFront } from './GreatHallEntrance';
import { greatHallRearWindow } from './GreatHallRearWindow';
import { place, type Frame, type Masonry } from './Masonry';
import { pitchedRoof, roofSpire } from './RoofParts';

export interface HallMaterials<M> {
  stone: M;
  trim: M;
  slate: M;
  iron: M;
  glass: M;
  rearGlass?: M;
  rearTrim?: M;
  entryGlass?: M;
  entryPaving?: M;
  door: M;
  clockMetal?: M;
  clockRecess?: M;
  portalTrim?: M;
}

/** The same window positions, gables and roof in the exterior and walkable room. */
export function greatHallShell<M>(
  mesh: Masonry<M>, mat: HallMaterials<M>, entrance: Frame, hallFloor: number, exterior: boolean,
): void {
  const floor = hallFloor - GREAT_HALL.innerStairRise;
  const { width, length, eave, roofRise, bays } = GREAT_HALL;
  const bayWidth = length / bays;
  const ridge = place(entrance, 0, floor, length / 2);
  const roof = { x: ridge.x, z: ridge.z, yaw: entrance.yaw };
  const end = place(entrance, 0, floor, length);
  const rear = { x: end.x, z: end.z, yaw: entrance.yaw + Math.PI };

  for (const side of [-1, 1]) {
    const faceYaw = entrance.yaw - side * Math.PI / 2;
    for (let i = 0; i < bays; i++) {
      const point = place(entrance, side * width / 2, floor, (i + 0.5) * bayWidth);
      const bay = { x: point.x, z: point.z, yaw: faceYaw };
      const lower = { width: 0.92, height: 2.95, sill: floor + 1.37 };
      const upper = { width: 1.49, height: 4.32, sill: floor + 5.77 };
      archWall(mesh, mat.stone, bay, bayWidth, floor, floor + 5.1, WALL_DEPTH, lower);
      archWall(mesh, mat.stone, bay, bayWidth, floor + 5.1, floor + eave, WALL_DEPTH, upper);
      const mullion = exterior ? mat.trim : mat.iron;
      lancetWindow(mesh, mat.trim, mat.glass, bay, lower, WALL_DEPTH, exterior ? 1 : 2, mullion, false);
      lancetWindow(mesh, mat.trim, mat.glass, bay, upper, WALL_DEPTH, 2, mullion);
    }
    if (exterior) {
      for (let i = 1; i < bays; i++) {
        const pier = place(entrance, side * (width + WALL_DEPTH) / 2, floor, i * bayWidth);
        pinnacledButtress(mesh, mat.stone, mat.trim, { x: pier.x, z: pier.z, yaw: faceYaw },
          floor, eave + 0.25, 0.92, 0.92, 2.56);
      }
    }
  }

  greatHallFront(mesh, mat, entrance, hallFloor, exterior);
  greatHallRearWindow(mesh, mat, rear, floor, width, floor + eave, !exterior);

  for (const gable of [entrance, rear]) {
    gableWall(mesh, mat.stone, gable, width, floor + eave, roofRise);
  }
  pitchedRoof(mesh, mat.slate, mat.iron, roof, width, length, floor + eave, roofRise, 0.18);
  if (exterior) hallOrnament(mesh, mat, entrance, floor);
}

function hallOrnament<M>(mesh: Masonry<M>, mat: HallMaterials<M>, frame: Frame, floor: number): void {
  const { width, length, eave, roofRise, gableSpire, ridgeSpire } = GREAT_HALL;
  const ridgeY = floor + eave + roofRise;
  const spireMaterials = { shaft: mat.stone, trim: mat.trim, slate: mat.slate, iron: mat.iron };
  const end = place(frame, 0, floor, length);
  for (const side of [-1, 1]) {
    const edge = side * (width / 2 + WALL_DEPTH / 2);
    for (const [y, height, depth] of [[0.26, 0.32, 0.37], [5.24, 0.23, 0.26], [eave - 0.19, 0.35, 0.41]]) {
      mesh.box(mat.trim, place(frame, edge, floor + y, length / 2), depth, height, length, frame.yaw);
    }
  }

  for (const gable of [frame, { x: end.x, z: end.z, yaw: frame.yaw + Math.PI }]) {
    const steps = 12;
    for (const side of [-1, 1]) {
      for (let step = 0; step < steps; step++) {
        const stepWidth = width / (steps * 2);
        const across = side * (width / 2 - (step + 0.5) * stepWidth);
        const y = floor + eave + (step + 0.34) * roofRise / steps;
        mesh.box(mat.trim, place(gable, across, y, -0.38), stepWidth + 0.1, roofRise / steps + 0.13, 0.66, gable.yaw);
      }
      // The front east corner is enclosed by the windowed return beside the porch.
      if (gable !== frame || side < 0) {
        const corner = place(gable, side * (width / 2 - 0.52), floor, -0.62);
        const pilaster = { x: corner.x, z: corner.z, yaw: gable.yaw };
        pinnacledButtress(mesh, mat.stone, mat.trim, pilaster, floor, eave + 0.32, 1.22, 0.84, 3.25);
      }
    }
    const stem = place(gable, 0, ridgeY, gable === frame ? 0.43 : -0.29);
    roofSpire(mesh, spireMaterials, { x: stem.x, z: stem.z, yaw: gable.yaw }, ridgeY - gableSpire.embed, gableSpire);
  }

  const spire = place(frame, 0, ridgeY, length / 2);
  roofSpire(mesh, { ...spireMaterials, shaft: mat.slate }, { x: spire.x, z: spire.z, yaw: frame.yaw },
    ridgeY - ridgeSpire.embed, ridgeSpire);
  for (const side of [-1, 1]) {
    for (const fraction of [0.13, 0.26, 0.39, 0.63, 0.76, 0.89]) {
      const point = place(frame, side * width * 0.36, floor, fraction * length);
      const dormer = { x: point.x, z: point.z, yaw: frame.yaw - side * Math.PI / 2 };
      const y = floor + eave + roofRise * 0.21;
      mesh.box(mat.stone, place(dormer, 0, y + 0.55), 0.92, 1.45, 1.23, dormer.yaw);
      pitchedRoof(mesh, mat.slate, mat.iron, dormer, 0.96, 1.26, y + 1.28, 0.74, 0.11);
      const facade = place(dormer, 0, y, -0.63);
      lancetWindow(mesh, mat.trim, mat.door, { x: facade.x, z: facade.z, yaw: dormer.yaw },
        { width: 0.34, height: 0.78, sill: y + 0.32 }, 0.04);
    }
  }
}
