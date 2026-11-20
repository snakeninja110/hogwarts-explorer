// Coordinates shared by the procedural exterior and the walkable approach.
export const ENTRANCE_COURTYARD = {
  width: 18.6,
  length: 24,
  bays: 9,
  frontBays: 7,
  arcadeDepth: 2.9,
  eave: 3.05,
  sideEntryBay: 5,
  viaductEntryBay: 1,
  openingWidth: 1.85,
  wallDepth: 0.46,
};

export const GREAT_HALL = {
  width: 13.2,
  length: 38,
  eave: 11.8,
  roofRise: 9.5,
  gableSpire: { radius: 0.97, shaft: 7.2, cap: 5.55, embed: 2.4 },
  ridgeSpire: { radius: 1.15, shaft: 3.65, cap: 11.4, embed: 1.3 },
  bays: 12,
  entryWidth: 3.25,
  entryHeight: 4.38,
  threshold: 0.54,
  entryBayDepth: 3.75,
  entryBayWidth: 7.58,
  porchDepth: 1.48,
  entryLandingWidth: 7.46,
  entrySteps: 3,
  stepDepth: 0.36,
  innerStairRise: 1.44,
};

export const WALL_DEPTH = 0.8;
export const GREAT_HALL_ENTRANCE_Z = 19;
export const GREAT_HALL_DOOR_Z = GREAT_HALL_ENTRANCE_Z - GREAT_HALL.entryBayDepth;
export const COURTYARD_BACK_Z = GREAT_HALL_DOOR_Z + 0.51;
export const CASTLE_APPROACH = {
  x: -39.5,
  floorY: 32,
  courtyardFrontZ: COURTYARD_BACK_Z - ENTRANCE_COURTYARD.length,
};
export const COURTYARD_INNER_FRONT_Z = CASTLE_APPROACH.courtyardFrontZ + ENTRANCE_COURTYARD.arcadeDepth;
export const COURTYARD_INNER_BACK_Z = COURTYARD_BACK_Z - ENTRANCE_COURTYARD.arcadeDepth;
export const COURTYARD_INNER_HALF_WIDTH = ENTRANCE_COURTYARD.width / 2 - ENTRANCE_COURTYARD.arcadeDepth;
export const COURTYARD_SIDE_ENTRY_Z = CASTLE_APPROACH.courtyardFrontZ
  + (ENTRANCE_COURTYARD.sideEntryBay + 0.5) * ENTRANCE_COURTYARD.length / ENTRANCE_COURTYARD.bays;
export const VIADUCT_ENTRY_Z = CASTLE_APPROACH.courtyardFrontZ
  + (ENTRANCE_COURTYARD.viaductEntryBay + 0.5) * ENTRANCE_COURTYARD.length / ENTRANCE_COURTYARD.bays;

const viaductStart = { x: CASTLE_APPROACH.x + 12.3, z: VIADUCT_ENTRY_Z + 0.22 };
const viaductEnd = { x: -6.7, z: -20.25 };
export const VIADUCT = {
  ...viaductStart,
  yaw: Math.atan2(viaductStart.z - viaductEnd.z, viaductEnd.x - viaductStart.x),
  length: Math.hypot(viaductEnd.x - viaductStart.x, viaductEnd.z - viaductStart.z),
  width: 4.65,
  deckY: CASTLE_APPROACH.floorY,
  landingLength: 5.15,
  landingWidth: 6.40,
};

export const COURTYARD_TURRET = {
  x: CASTLE_APPROACH.x - ENTRANCE_COURTYARD.width / 2 - 1.39,
  z: GREAT_HALL_ENTRANCE_Z - 1.43,
  radius: 2.18,
  base: CASTLE_APPROACH.floorY - 6.9,
  eave: CASTLE_APPROACH.floorY + 5.45,
  roofRise: 3.68,
};

const castleUpperFloorY = CASTLE_APPROACH.floorY + GREAT_HALL.threshold;
export const GREAT_HALL_FLOOR_Y = castleUpperFloorY + GREAT_HALL.innerStairRise;

// The wing ridges define the quadrangle frame independently of the tower centres.
export const STAIRCASE_QUAD = {
  x: CASTLE_APPROACH.x + 19.45, z: GREAT_HALL_ENTRANCE_Z + 1.1, yaw: Math.PI / 4,
  span: 30, wingWidth: 7.6, floor: castleUpperFloorY,
};

const mainTowerOffset = { across: -1.55, depth: -1.1 };
const quadCos = Math.cos(STAIRCASE_QUAD.yaw);
const quadSin = Math.sin(STAIRCASE_QUAD.yaw);
export const MAIN_TOWER = {
  x: STAIRCASE_QUAD.x + mainTowerOffset.across * quadCos + mainTowerOffset.depth * quadSin,
  z: STAIRCASE_QUAD.z - mainTowerOffset.across * quadSin + mainTowerOffset.depth * quadCos,
  base: CASTLE_APPROACH.floorY - 4.4,
  floor: castleUpperFloorY,
  radius: 9.45,
  roofBase: castleUpperFloorY + 38.6,
  roofRise: 32.8,
};

export const HALL_TOWER_LINK = {
  west: CASTLE_APPROACH.x + 3.92,
  east: MAIN_TOWER.x - 7.0,
  front: GREAT_HALL_ENTRANCE_Z - 0.65,
  back: GREAT_HALL_ENTRANCE_Z + 5.85,
  floor: castleUpperFloorY,
  eave: castleUpperFloorY + 8.57,
  rise: 3.05,
};

// Centres in the same quadrangle frame, fitted to the scan's wing junctions.
export const QUAD_TOWERS = {
  stoneBridge: { across: STAIRCASE_QUAD.span + 2.55, depth: -0.85, radius: 3.16, base: -9.6, eave: 18.8, rise: 26.0 },
  north: { across: -3.9, depth: STAIRCASE_QUAD.span + 3.8, radius: 3.46, base: -10.7, eave: 21.1, rise: 14.5 },
  gryffindor: { across: STAIRCASE_QUAD.span + 5.35, depth: STAIRCASE_QUAD.span + 5.2, radius: 4.40, base: -12.8, eave: 22.4, rise: 18.5 },
};

export const QUAD_ENTRY = {
  across: STAIRCASE_QUAD.span / 2,
  y: STAIRCASE_QUAD.floor + 1.75,
  width: 4.3,
  wallDepth: 0.58,
  pavingWidth: STAIRCASE_QUAD.span - STAIRCASE_QUAD.wingWidth + 0.44,
};

export const QUAD_WING_PLINTH = {
  top: STAIRCASE_QUAD.floor - 0.96,
  rearBottom: STAIRCASE_QUAD.floor - 3.85,
  entranceBottom: STAIRCASE_QUAD.floor - 7.8,
  flankBottom: STAIRCASE_QUAD.floor - 4.9,
  outerOverhang: QUAD_ENTRY.wallDepth / 2 + 0.69,
  innerOverhang: QUAD_ENTRY.wallDepth / 2 + 0.04,
  endOverhang: 0.40,
};

export const HOSPITAL_WING = {
  across: STAIRCASE_QUAD.span / 2 + 0.4,
  courtEnd: 21.4, width: 7.1, length: 11.8, linkLength: 9.6, linkWidth: 3.65,
};

// The tower and the wooden bridge approach share the hospital connector's axis.
const clockTowerBack = HOSPITAL_WING.courtEnd + HOSPITAL_WING.length + HOSPITAL_WING.linkLength - 0.28;
export const CLOCK_TOWER = {
  x: STAIRCASE_QUAD.x + HOSPITAL_WING.across * quadCos + clockTowerBack * quadSin,
  z: STAIRCASE_QUAD.z - HOSPITAL_WING.across * quadSin + clockTowerBack * quadCos,
  yaw: STAIRCASE_QUAD.yaw,
  width: 25.4, length: 12.75, floor: STAIRCASE_QUAD.floor - 1.38,
};

export const CLOCK_TOWER_PLINTH = {
  top: CLOCK_TOWER.floor - 12, thickness: 0.62, overhang: 0.52,
};

export const CLOCK_TOWER_COURTYARD = {
  width: 22.6, start: CLOCK_TOWER.length - 0.24, end: CLOCK_TOWER.length + 16.65,
  wall: 0.54, eave: 3.14, gateway: 3.45, landing: 2.2,
};

export const BOATHOUSE = {
  // Frame starts at the lake arch. The scan shows the bow pointing mostly
  // out past the courtyard, with a smaller turn toward the cliff side.
  x: -92.25, z: -35.65, yaw: 22 * Math.PI / 180,
  width: 6.2, length: 8.8, deckY: 0.72, eave: 2.75, roofRise: 4.25,
  wall: 0.48, channel: 2.42, rearLanding: 2.3,
};

const rearApproach = BOATHOUSE.length + 1.65;
export const BOATHOUSE_LANDING = {
  x: BOATHOUSE.x + rearApproach * Math.sin(BOATHOUSE.yaw),
  y: BOATHOUSE.deckY,
  z: BOATHOUSE.z + rearApproach * Math.cos(BOATHOUSE.yaw),
};

export const CLIFF_STAIR_WIDTH = 1.9;
type CliffTurn = typeof BOATHOUSE_LANDING & { round?: boolean };

// The scan's centreline, aligned to the boathouse and courtyard endpoints.
// Repeated elevations are the paved traverses between flights.
export const CLIFF_STAIR_TURNS: readonly CliffTurn[] = [
  BOATHOUSE_LANDING,
  { x: -82.3, y: 2.17, z: -25.05 },
  { x: -73.7, y: 6, z: -21.0 },
  { x: -76.8, y: 6, z: -13.6 },
  { x: -76.3, y: 7.62, z: -9.4, round: true },
  { x: -65.4, y: 12.6, z: -10.8 },
  { x: -59.8, y: 12.6, z: -15.75, round: true },
  { x: -53.45, y: 17, z: -11.1 },
  { x: -54.35, y: 19, z: -5.2 },
  { x: -67.1, y: 19, z: 1.25 },
  { x: -69.15, y: 19, z: 5.25, round: true },
  { x: -60.5, y: 26.5, z: 17.2 },
  { x: -62.2, y: 28, z: 21.25 },
  { x: -57.75, y: 29.25, z: 23.25 },
  { x: -53.2, y: 29.25, z: 18.8 },
  { x: CASTLE_APPROACH.x - ENTRANCE_COURTYARD.width / 2 - 1.7, y: CASTLE_APPROACH.floorY, z: COURTYARD_SIDE_ENTRY_Z },
];
