#!/usr/bin/env node
// One command that answers "is this change safe?".
//
// This is the inner loop the talk argues for: every check here is deterministic,
// so the answer does not depend on a human reading a diff. An agent runs this
// before proposing a change; CI runs the same thing.
//
// Order is cheapest-first so a broken type doesn't wait on a 1.3s scene build.
//
// Usage:
//   node scripts/check.mjs           # full gate
//   node scripts/check.mjs --quick   # skip the scene build (types + conventions)

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');

function run(label, command, args) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    child.on('close', (code) => {
      resolve({ label, code, output, ms: Date.now() - started });
    });
  });
}

const steps = [
  { label: 'types', command: 'npx', args: ['tsc', '--noEmit'] },
  { label: 'conventions', command: 'node', args: ['scripts/lint-conventions.mjs'] },
];

if (!quick) {
  steps.push({ label: 'scene', command: 'node', args: ['scripts/verify-scene.mjs'] });
}

const results = [];
for (const step of steps) {
  const result = await run(step.label, step.command, step.args);
  results.push(result);
  const status = result.code === 0 ? 'ok  ' : 'FAIL';
  process.stdout.write(`${status}  ${step.label.padEnd(12)} ${String(result.ms).padStart(6)}ms\n`);
  if (result.code !== 0) {
    // Show the failing step's output immediately; a later step's failure is
    // usually a consequence and not worth reading.
    process.stdout.write(`${result.output.split('\n').slice(0, 40).join('\n')}\n`);
    break;
  }
}

const failed = results.find((r) => r.code !== 0);
const total = results.reduce((sum, r) => sum + r.ms, 0);

if (failed) {
  process.stdout.write(`\n${failed.label} failed — see output above\n`);
  process.exit(failed.code ?? 1);
}

process.stdout.write(`\nall checks passed in ${total}ms\n`);
