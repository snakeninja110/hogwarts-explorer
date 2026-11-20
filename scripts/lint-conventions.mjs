#!/usr/bin/env node
// Project conventions as executable checks.
//
// These rules exist because each one names a mistake that has already happened in
// this codebase, or that an agent will make by pattern-matching the surrounding
// code. Prose in AGENTS.md cannot enforce them; this can.
//
// Rules are intentionally narrow and categorical — a rule that needs a judgement
// call in each instance would just move the review burden, not remove it.
//
// Usage:
//   node scripts/lint-conventions.mjs
//   node scripts/lint-conventions.mjs --json

import ts from 'typescript';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonOut = process.argv.includes('--json');

const violations = [];

function report(rule, file, line, message) {
  violations.push({
    rule,
    file: path.relative(root, file),
    line,
    message,
  });
}

async function collectSources(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectSources(full)));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

// --- Rule: layer direction -------------------------------------------------
// The world builders are pure geometry. If they import UI, engine wiring, or
// audio, they stop being runnable headlessly and the verifier can't load them.
const FORBIDDEN_IMPORTS = {
  'src/world/': ['src/components/', 'src/core/', 'src/audio/'],
  'src/rendering/': ['src/components/', 'src/world/zones/'],
  'src/utils/': ['src/components/', 'src/core/'],
};

function ruleLayerDirection(sf, file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const from = Object.keys(FORBIDDEN_IMPORTS).find((prefix) => rel.startsWith(prefix));
  if (!from) return;

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!spec.startsWith('.')) continue;

    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(rel), spec),
    );
    for (const banned of FORBIDDEN_IMPORTS[from]) {
      if (target.startsWith(banned)) {
        report('layer-direction', file, lineOf(sf, stmt),
          `${rel} imports ${target} — ${from}* must not depend on ${banned}*`);
      }
    }
  }
}

// --- Rule: batch castle geometry through Masonry ---------------------------
// Raw MeshBuilder calls create one mesh and one draw call each. The castle is
// batched per building+material, and a single stray MeshBuilder silently breaks
// that, pushing the draw-call count up with no visible cause.
//
// Scope is deliberately narrow: only castle architecture generators. Terrain,
// collision proxies and the skybox are legitimately single meshes and have no
// batching benefit — including them here would make the rule noise.
const MESHBUILDER_SCOPE = 'src/world/generators/';
const MESHBUILDER_EXEMPT = [
  'src/world/generators/HallsDemo.ts', // pre-Masonry legacy builder, see docs/architecture
];

function ruleNoRawMeshBuilder(sf, file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (!rel.startsWith(MESHBUILDER_SCOPE)) return;
  if (MESHBUILDER_EXEMPT.includes(rel)) return;

  const visit = (node) => {
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'MeshBuilder') {
      report('no-raw-meshbuilder', file, lineOf(sf, node),
        `MeshBuilder.${node.expression.name.text} bypasses the Masonry batch — use mesh.box/mesh.surface`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// --- Rule: no material construction inside loops ---------------------------
// Every material is a shader compile and a draw-call boundary. Building one per
// iteration is both a perf bug and, once agents copy the pattern, a structural one.
const MATERIAL_TYPES = new Set(['PBRMaterial', 'StandardMaterial', 'ShaderMaterial']);

function ruleNoMaterialInLoop(sf, file) {
  const visit = (node, inLoop) => {
    const nowInLoop = inLoop
      || ts.isForStatement(node)
      || ts.isForOfStatement(node)
      || ts.isForInStatement(node)
      || ts.isWhileStatement(node)
      || ts.isDoStatement(node);

    if (nowInLoop
      && ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && MATERIAL_TYPES.has(node.expression.text)) {
      report('no-material-in-loop', file, lineOf(sf, node),
        `${node.expression.text} constructed inside a loop — hoist it and share one instance`);
    }
    ts.forEachChild(node, (child) => visit(child, nowInLoop));
  };
  visit(sf, false);
}

// --- Rule: no vague escape hatches -----------------------------------------
// A TODO is a note to a future agent that it may stop here. The verifier and the
// lint rules are the place to record an unresolved problem, not a comment.
const ESCAPE_HATCHES = /\b(TODO|FIXME|HACK|XXX|for now|temporarily)\b/i;

function ruleNoEscapeHatch(sf, file) {
  const text = sf.getFullText();
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    if (!isComment) return;
    const hit = trimmed.match(ESCAPE_HATCHES);
    if (hit) {
      report('no-escape-hatch', file, i + 1,
        `"${hit[1]}" in a comment — fix it or file it, don't leave a note for the next agent`);
    }
  });
}

// --- Rule: zones implement the whole contract ------------------------------
// ZoneManager calls five members on every zone. A zone missing one fails at
// runtime, mid-transition, which is the hardest place to debug.
const ZONE_MEMBERS = ['id', 'name', 'spawnPoint', 'spawnTarget', 'load', 'unload', 'update', 'getInteractionHint'];

function ruleZoneContract(sf, file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (!rel.startsWith('src/world/zones/') || rel.endsWith('IZone.ts') || rel.endsWith('ZoneManager.ts')) return;

  let sawZoneClass = false;
  const memberNames = new Set();

  const visit = (node) => {
    if (ts.isClassDeclaration(node)) {
      const implementsIZone = (node.heritageClauses ?? []).some((clause) =>
        clause.types.some((t) => t.expression.getText(sf) === 'IZone'));
      if (implementsIZone) {
        sawZoneClass = true;
        for (const member of node.members) {
          if (member.name && ts.isIdentifier(member.name)) memberNames.add(member.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!sawZoneClass) return;
  for (const required of ZONE_MEMBERS) {
    if (!memberNames.has(required)) {
      report('zone-contract', file, 1, `zone class is missing "${required}" required by IZone`);
    }
  }
}

// --- Rule: no hardcoded world coordinates in generators --------------------
// Layout numbers live in castleLayout.ts so that the procedural exterior and the
// walkable collision hull agree by construction. A literal position inside a
// generator is a second source of truth, and nothing detects the drift: the
// building renders correctly and the player walks through the wall.
//
// Only large-magnitude literals are flagged. Small numbers are proportions and
// local offsets, which legitimately belong to the builder.
const POSITION_LITERAL_FLOOR = 5;

function ruleNoHardcodedWorldPosition(sf, file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (!rel.startsWith('src/world/generators/')) return;
  // CastleExterior composes the whole site and legitimately reads layout constants.
  if (rel.endsWith('CastleExterior.ts')) return;

  const visit = (node) => {
    const isVector3Ctor = ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'Vector3';
    const isVector3Call = ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'Vector3';

    if ((isVector3Ctor || isVector3Call) && node.arguments && node.arguments.length >= 2) {
      const [x, second] = node.arguments;
      const bigLiteral = (arg) => ts.isNumericLiteral(arg)
        && Math.abs(Number(arg.text)) >= POSITION_LITERAL_FLOOR;
      // (x, y, z) — x and z are world plane; (x, y) alone is usually local.
      const touchesWorld = bigLiteral(x) || (node.arguments.length >= 3 && bigLiteral(node.arguments[2]));
      if (touchesWorld) {
        report('no-hardcoded-world-position', file, lineOf(sf, node),
          'world-scale Vector3 literal — read the position from castleLayout instead');
      }
      void second;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// --- Existing debt, frozen ------------------------------------------------
// These are known violations in code written before the rule existed. Rather
// than a blanket disable (which lets new ones in) or a mass rewrite (which churns
// unrelated code), each is pinned by file and count. Fixing one is always allowed;
// adding one fails, because the count is a ceiling, not a target.
const DEBT_CEILING = {
  'no-material-in-loop': {
    'src/world/zones/CastleGroundsZone.ts': 1,
  },
  'no-hardcoded-world-position': {
    // Walkway shoulder and upper landing predate castleLayout. Moving them is a
    // geometry change and needs its own baseline diff, so it isn't folded in here.
    'src/world/generators/QuadWalkway.ts': 2,
  },
};

// --- Run -------------------------------------------------------------------

const files = await collectSources(path.join(root, 'src'));

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  ruleLayerDirection(sf, file);
  ruleNoRawMeshBuilder(sf, file);
  ruleNoMaterialInLoop(sf, file);
  ruleNoEscapeHatch(sf, file);
  ruleZoneContract(sf, file);
  ruleNoHardcodedWorldPosition(sf, file);
}

// Apply the debt ceiling: allowed counts are removed, anything over is reported.
const counts = new Map();
for (const v of violations) {
  const key = `${v.rule}\u0000${v.file}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

const allowed = new Map();
const overBudget = [];
for (const [key, count] of counts) {
  const [rule, file] = key.split('\u0000');
  const ceiling = DEBT_CEILING[rule]?.[file] ?? 0;
  const permitted = Math.min(count, ceiling);
  allowed.set(key, permitted);
  if (count > ceiling) overBudget.push({ rule, file, count, ceiling });
}

// Walk violations again, keeping only the ones beyond the permit.
const seen = new Map();
const kept = [];
for (const v of violations) {
  const key = `${v.rule}\u0000${v.file}`;
  const permit = allowed.get(key) ?? 0;
  const used = seen.get(key) ?? 0;
  if (used < permit) {
    seen.set(key, used + 1);
    continue;
  }
  kept.push(v);
}

violations.length = 0;
violations.push(...kept);

for (const over of overBudget) {
  violations.push({
    rule: over.rule,
    file: over.file,
    line: 0,
    message: `${over.count} occurrence(s), ceiling is ${over.ceiling} — this file's debt grew`,
  });
}

const byRule = violations.reduce((acc, v) => {
  acc[v.rule] = (acc[v.rule] ?? 0) + 1;
  return acc;
}, {});

const debtTotal = Object.values(DEBT_CEILING).reduce(
  (sum, perFile) => sum + Object.values(perFile).reduce((a, b) => a + b, 0), 0);

if (jsonOut) {
  process.stdout.write(`${JSON.stringify({ ok: violations.length === 0, count: violations.length, byRule, violations }, null, 2)}\n`);
} else {
  for (const v of violations) {
    process.stdout.write(`${v.file}:${v.line}  [${v.rule}]  ${v.message}\n`);
  }
  const rules = ['layer-direction', 'no-raw-meshbuilder', 'no-material-in-loop', 'no-escape-hatch', 'zone-contract', 'no-hardcoded-world-position'];
  process.stdout.write(`\n${rules.length} rules over ${files.length} files — `);
  process.stdout.write(violations.length === 0
    ? `clean (${debtTotal} known debt tolerated)\n`
    : `${violations.length} violation(s): ${Object.entries(byRule).map(([r, n]) => `${r}=${n}`).join(', ')}\n`);
}

process.exit(violations.length === 0 ? 0 : 1);
