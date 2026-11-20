#!/usr/bin/env node
// Headless scene verifier.
//
// This is the castle equivalent of a test suite: it builds the real generators
// against Babylon's NullEngine and asserts properties that used to be checked by
// squinting at a browser screenshot. Every failed assertion is something a human
// would otherwise have to catch during code review.
//
// Baseline JSON lives at docs/architecture/scene-baseline.json. When a change
// intentionally alters geometry, regenerate it with --update-baseline and review
// the diff — that diff is the review artifact.
//
// Usage:
//   node scripts/verify-scene.mjs                # assert against baseline
//   node scripts/verify-scene.mjs --update-baseline
//   node scripts/verify-scene.mjs --json         # machine-readable output

import { NullEngine, Scene, ShadowGenerator, DirectionalLight, Vector3, VertexBuffer } from '@babylonjs/core';
import { installBrowserStubs } from './lib/headless-babylon.mjs';
import { importBundled } from './lib/bundle.mjs';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

installBrowserStubs();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = path.join(root, 'node_modules', '.cache', 'verify-scene');
const baselinePath = path.join(root, 'docs', 'architecture', 'scene-baseline.json');

const args = new Set(process.argv.slice(2));
const updateBaseline = args.has('--update-baseline');
const jsonOut = args.has('--json');

// Geometry is allowed to drift a little; a real regression moves these a lot.
const TOLERANCE = {
  triangles: 0.02, // 2% — catches accidental tessellation changes
  meshes: 0.1, // 10% — new ornament is normal, wholesale loss is not
  extent: 0.08, // 8% — world scale should be stable
};

const failures = [];
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) failures.push({ name, detail });
}

function fmt(n) {
  return typeof n === 'number' ? Number(n.toFixed(2)) : n;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

// Two separate builds, because the two halves of the world are loaded by
// different code paths and one was previously a blind spot:
//   exterior — CastleExterior, mounted by CastleGroundsZone
//   hall     — HallsDemo, mounted by GreatHallZone when you walk through the doors
// Verifying only the exterior left the entire Great Hall interior unchecked.
const BUILDERS = [
  {
    name: 'exterior',
    entry: 'src/world/generators/CastleExterior.ts',
    exportName: 'CastleExterior',
  },
  {
    name: 'hall',
    entry: 'src/world/generators/HallsDemo.ts',
    exportName: 'HallsDemo',
  },
];

async function buildScene(builder) {
  const { module } = await importBundled(path.join(root, builder.entry), { root, tmpDir });
  const api = module[builder.exportName];

  const engine = new NullEngine({ renderWidth: 1280, renderHeight: 720, textureSize: 256 });
  const scene = new Scene(engine);
  const light = new DirectionalLight('verify-sun', new Vector3(-0.4, -1, -0.3), scene);
  const shadows = new ShadowGenerator(512, light);

  const result = api.build(scene, shadows);
  // CastleExterior returns Mesh[]; HallsDemo returns { meshes, lights, materials }.
  const meshes = Array.isArray(result) ? result : result.meshes;
  return { engine, scene, meshes, builder };
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

function measure(meshes) {
  let vertices = 0;
  let triangles = 0;
  let nonFinite = 0;
  let zeroVertex = 0;
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const unnamed = [];
  const noMaterial = [];

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const v = mesh.getTotalVertices();
    vertices += v;
    triangles += (mesh.getTotalIndices?.() ?? 0) / 3;
    if (v === 0) zeroVertex++;

    const bb = mesh.getBoundingInfo().boundingBox;
    for (const corner of [bb.minimumWorld, bb.maximumWorld]) {
      if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y) || !Number.isFinite(corner.z)) {
        nonFinite++;
        continue;
      }
      box.minX = Math.min(box.minX, corner.x);
      box.maxX = Math.max(box.maxX, corner.x);
      box.minY = Math.min(box.minY, corner.y);
      box.maxY = Math.max(box.maxY, corner.y);
      box.minZ = Math.min(box.minZ, corner.z);
      box.maxZ = Math.max(box.maxZ, corner.z);
    }

    if (!mesh.name) unnamed.push(mesh.uniqueId);
    // Invisible meshes are collision proxies (see ADR 0002). They never render,
    // so they legitimately carry no material — asserting otherwise is wrong.
    if (!mesh.material && mesh.isVisible) noMaterial.push(mesh.name);
  }

  return { vertices, triangles: Math.round(triangles), nonFinite, zeroVertex, box, unnamed, noMaterial };
}

/**
 * Per-mesh fingerprints: vertex count plus a bbox rounded to the centimetre.
 *
 * A whole-scene bounding box is useless as a change detector here — the terrain
 * extends well past the buildings, so moving the Great Hall 6m changes the scene
 * box by under 1%. Per-mesh bboxes catch it, because the moving building's own
 * box is what changes.
 */
function meshFingerprints(meshes) {
  const prints = {};
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const bb = mesh.getBoundingInfo().boundingBox;
    const r = (n) => Math.round(n * 100) / 100;
    prints[mesh.name] = {
      v: mesh.getTotalVertices(),
      min: [r(bb.minimumWorld.x), r(bb.minimumWorld.y), r(bb.minimumWorld.z)],
      max: [r(bb.maximumWorld.x), r(bb.maximumWorld.y), r(bb.maximumWorld.z)],
    };
  }
  return prints;
}

/** Full vertex hash, all three axes. Used to prove two builds are identical. */
function geometrySignature(meshes) {
  const parts = [];
  for (const mesh of [...meshes].sort((a, b) => a.name.localeCompare(b.name))) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
    let hash = 0;
    for (let i = 0; i < positions.length; i += 1) {
      hash = (hash * 31 + Math.round(positions[i] * 1000)) | 0;
    }
    parts.push(`${mesh.name}:${mesh.getTotalVertices()}:${hash}`);
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assertGeometry(m, sceneName) {
  const tag = (name) => `${sceneName}: ${name}`;
  check(tag('no NaN/Infinity in world bounds'), m.nonFinite === 0, `${m.nonFinite} non-finite corners`);
  check(tag('no empty meshes'), m.zeroVertex === 0, `${m.zeroVertex} meshes with 0 vertices`);
  check(tag('every mesh has a material'), m.noMaterial.length === 0, m.noMaterial.slice(0, 5).join(', '));
  check(tag('every mesh is named'), m.unnamed.length === 0, `${m.unnamed.length} unnamed`);

  // The castle sits on the lake shore at y=0 and must not sink below the water.
  if (sceneName === 'exterior') {
    check(tag('nothing sinks below lake level'), m.box.minY > -2, `minY=${fmt(m.box.minY)}`);
  }

  // Plausible extent differs per scene: the exterior is a whole castle outdoors,
  // the hall is one interior room. Thresholds are sanity rails against a build
  // that collapsed to nothing or blew up, not precise dimensions.
  const spanX = m.box.maxX - m.box.minX;
  const spanZ = m.box.maxZ - m.box.minZ;
  const MAX_Y = m.box.maxY;

  const bounds = sceneName === 'exterior'
    ? { minX: 100, maxX: 400, minZ: 60, maxZ: 400, minY: 60, maxY: 200 }
    : { minX: 8, maxX: 60, minZ: 20, maxZ: 90, minY: 8, maxY: 40 };

  check(tag('footprint is plausible'),
    spanX > bounds.minX && spanX < bounds.maxX && spanZ > bounds.minZ && spanZ < bounds.maxZ,
    `x=${fmt(spanX)} z=${fmt(spanZ)} (expect ${bounds.minX}–${bounds.maxX} / ${bounds.minZ}–${bounds.maxZ})`);
  check(tag('height is plausible'),
    MAX_Y > bounds.minY && MAX_Y < bounds.maxY,
    `maxY=${fmt(MAX_Y)} (expect ${bounds.minY}–${bounds.maxY})`);
}

function assertDoors(meshes) {
  // Both door states exist as batches and never render at the same time; the
  // shell toggles them. Getting this wrong leaves a hole in the Great Hall.
  const open = meshes.filter((x) => x.name.startsWith('great-hall-open-doors'));
  const closed = meshes.filter((x) => x.name.startsWith('great-hall-closed-doors'));

  check('both door batches built', open.length > 0 && closed.length > 0,
    `open=${open.length} closed=${closed.length}`);

  const openOn = open.every((x) => x.isEnabled());
  const closedOff = closed.every((x) => !x.isEnabled());
  check('exactly one door state is active', openOn && closedOff,
    `openEnabled=${openOn} closedEnabled=${!closedOff}`);
}

function assertDeterminism(sigA, sigB) {
  check('build is deterministic', sigA === sigB,
    sigA === sigB ? 'identical vertex hashes' : 'two builds produced different geometry');
}

function assertStableAgainstBaseline(current, baseline) {
  if (!baseline) {
    check('baseline exists', false, 'missing scene-baseline.json — run with --update-baseline');
    return;
  }

  const ratio = (now, before) => (before === 0 ? (now === 0 ? 1 : Infinity) : now / before);

  const triRatio = ratio(current.triangles, baseline.triangles);
  check('triangle count within tolerance',
    Math.abs(triRatio - 1) <= TOLERANCE.triangles,
    `${current.triangles} vs ${baseline.triangles} (${fmt((triRatio - 1) * 100)}%)`);

  const meshRatio = ratio(current.meshes, baseline.meshes);
  check('mesh count within tolerance',
    Math.abs(meshRatio - 1) <= TOLERANCE.meshes,
    `${current.meshes} vs ${baseline.meshes}`);

  for (const axis of ['X', 'Y', 'Z']) {
    const now = current.box[`max${axis}`] - current.box[`min${axis}`];
    const before = baseline.box[`max${axis}`] - baseline.box[`min${axis}`];
    const r = ratio(now, before);
    check(`${axis} extent within tolerance`,
      Math.abs(r - 1) <= TOLERANCE.extent,
      `${fmt(now)} vs ${fmt(before)}`);
  }
}

/**
 * Per-mesh drift check. This is the assertion that actually catches "the agent
 * nudged one building" — a change the scene-wide box hides entirely.
 *
 * Intentional geometry changes are expected to fail this and require
 * --update-baseline, so the diff of scene-baseline.json becomes the review
 * artifact: you see exactly which buildings moved and by how much.
 */
function assertMeshDrift(currentPrints, baselinePrints, { maxDrift = 0.02 } = {}) {
  const currentNames = Object.keys(currentPrints);
  const baselineNames = Object.keys(baselinePrints);

  const added = currentNames.filter((n) => !(n in baselinePrints));
  const removed = baselineNames.filter((n) => !(n in currentPrints));

  check('no meshes silently added', added.length === 0,
    added.length ? `${added.length}: ${added.slice(0, 4).join(', ')}` : 'none');
  check('no meshes silently removed', removed.length === 0,
    removed.length ? `${removed.length}: ${removed.slice(0, 4).join(', ')}` : 'none');

  const moved = [];
  const retessellated = [];
  for (const name of currentNames) {
    const before = baselinePrints[name];
    if (!before) continue;
    const now = currentPrints[name];

    if (now.v !== before.v) retessellated.push(`${name} ${before.v}->${now.v}`);

    const drift = Math.max(
      ...now.min.map((v, i) => Math.abs(v - before.min[i])),
      ...now.max.map((v, i) => Math.abs(v - before.max[i])),
    );
    if (drift > maxDrift) moved.push(`${name} ${fmt(drift)}m`);
  }

  check('no mesh drifted in world space', moved.length === 0,
    moved.length ? `${moved.length} moved: ${moved.slice(0, 4).join(', ')}` : 'all within 2cm');
  check('no mesh silently retessellated', retessellated.length === 0,
    retessellated.length ? retessellated.slice(0, 4).join(', ') : 'vertex counts stable');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const t0 = Date.now();

const built = [];
const scenes = {};

for (const builder of BUILDERS) {
  const first = await buildScene(builder);
  const m1 = measure(first.meshes);
  const sig1 = geometrySignature(first.meshes);
  const prints = meshFingerprints(first.meshes);

  // A second build in the same process catches accidental shared mutable state
  // in the generator modules (module-level caches, reused arrays).
  const second = await buildScene(builder);
  const sig2 = geometrySignature(second.meshes);

  assertGeometry(m1, builder.name);
  if (builder.name === 'exterior') assertDoors(first.meshes);
  assertDeterminism(sig1, sig2);

  scenes[builder.name] = {
    meshes: first.meshes.length,
    triangles: m1.triangles,
    vertices: m1.vertices,
    box: m1.box,
    meshFingerprints: prints,
  };
  built.push(first, second);
}

let baseline = null;
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
} catch {
  baseline = null;
}

if (updateBaseline) {
  await mkdir(path.dirname(baselinePath), { recursive: true });
  const payload = {
    note: 'Generated by scripts/verify-scene.mjs. Every geometry change must show up as a diff here.',
    scenes: Object.fromEntries(Object.entries(scenes).map(([name, s]) => [name, {
      meshes: s.meshes,
      triangles: s.triangles,
      vertices: s.vertices,
      box: Object.fromEntries(Object.entries(s.box).map(([k, v]) => [k, fmt(v)])),
      meshFingerprints: s.meshFingerprints,
    }])),
  };
  await writeFile(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  check('baseline updated', true, path.relative(root, baselinePath));
} else if (!baseline?.scenes) {
  check('baseline present and current format', false,
    'missing or outdated baseline — run: npm run verify:scene:update');
} else {
  for (const [name, current] of Object.entries(scenes)) {
    const before = baseline.scenes[name];
    if (!before) {
      check(`${name}: baseline entry exists`, false, 'no recorded baseline for this build');
      continue;
    }
    assertStableAgainstBaseline(current, before, name);
    assertMeshDrift(current.meshFingerprints, before.meshFingerprints, name);
  }
}

for (const b of built) {
  b.scene.dispose();
  b.engine.dispose();
}
await rm(tmpDir, { recursive: true, force: true });

const duration = Date.now() - t0;
const totals = Object.values(scenes).reduce(
  (acc, s) => ({ meshes: acc.meshes + s.meshes, triangles: acc.triangles + s.triangles }),
  { meshes: 0, triangles: 0 });
const summary = {
  ok: failures.length === 0,
  durationMs: duration,
  scenes: Object.fromEntries(Object.entries(scenes).map(([name, s]) => [name, {
    meshes: s.meshes,
    triangles: s.triangles,
    vertices: s.vertices,
    box: Object.fromEntries(Object.entries(s.box).map(([k, v]) => [k, fmt(v)])),
  }])),
  totals,
  checks,
};

if (jsonOut) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  for (const c of checks) {
    process.stdout.write(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}\n`);
  }
  process.stdout.write(`\n${failures.length === 0 ? 'scene ok' : `${failures.length} failure(s)`} in ${duration}ms\n`);
  for (const [name, s] of Object.entries(scenes)) {
    process.stdout.write(`  ${name.padEnd(9)} meshes ${String(s.meshes).padStart(3)}  triangles ${String(s.triangles).padStart(7)}  vertices ${s.vertices}\n`);
  }
  process.stdout.write(`  ${'total'.padEnd(9)} meshes ${String(totals.meshes).padStart(3)}  triangles ${String(totals.triangles).padStart(7)}\n`);
}

process.exit(failures.length === 0 ? 0 : 1);
