#!/usr/bin/env node

/**
 * Ensures every GitHub Action referenced from workflows and composite actions is pinned to a
 * full-length commit SHA with a version comment. Tags and branches are mutable and can be
 * repointed to malicious commits; commit SHAs cannot. Run from repo root.
 *
 * Usage:
 *   node scripts/check-actions-pinned.mjs   # check only, exit 1 if any ref is not pinned
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, '.github/workflows');
const ACTIONS_DIR = path.join(ROOT, '.github/actions');

// Block style: `uses: ref # comment` or `- uses: ref # comment`
const BLOCK_USES = /^\s*(?:-\s+)?(['"]?)uses\1\s*:\s*(.*)$/;
// Flow style: `- { uses: ref, with: {...} } # comment` (possibly several per line)
const FLOW_USES = /[{,]\s*(['"]?)uses\1\s*:\s*(['"]?)([^'"\s,{}#]*)\2/g;
const TRAILING_COMMENT = /\s(#.*)$/;
const PINNED_REF = /^[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}$/;
const PINNED_DOCKER_REF = /^docker:\/\/\S+@sha256:[0-9a-f]{64}$/;
const VERSION_COMMENT = /^#\s*v\S+/;

function isYaml(name) {
  return name.endsWith('.yml') || name.endsWith('.yaml');
}

// .github/workflows/*.{yml,yaml} + .github/actions/**/action.{yml,yaml} (exclude node_modules)
function findFiles() {
  const files = [];

  if (fs.existsSync(WORKFLOWS_DIR)) {
    for (const entry of fs.readdirSync(WORKFLOWS_DIR, { withFileTypes: true })) {
      if (entry.isFile() && isYaml(entry.name)) {
        files.push(path.join(WORKFLOWS_DIR, entry.name));
      }
    }
  }

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
      } else if (entry.isFile() && (entry.name === 'action.yml' || entry.name === 'action.yaml')) {
        files.push(full);
      }
    }
  };
  if (fs.existsSync(ACTIONS_DIR)) walk(ACTIONS_DIR);

  return files.sort();
}

// Splits `ref # comment` into its parts, stripping optional quotes around the ref.
function parseUses(value) {
  const match = value.trim().match(/^(['"]?)([^'"\s#]*)\1\s*(#.*)?$/);
  if (!match) return { ref: value.trim(), comment: '' };
  return { ref: match[2], comment: (match[3] || '').trim() };
}

// Returns every `uses:` reference on a line, in block or flow style.
function extractUses(line) {
  const block = line.match(BLOCK_USES);
  if (block) return [parseUses(block[2])];

  const comment = (line.match(TRAILING_COMMENT)?.[1] || '').trim();
  return [...line.matchAll(FLOW_USES)].map((match) => ({ ref: match[3], comment }));
}

function checkRef(ref, comment) {
  if (ref.startsWith('./')) return null;
  if (ref.startsWith('docker://')) {
    return PINNED_DOCKER_REF.test(ref) ? null : 'docker image must be pinned to an @sha256 digest';
  }
  if (!PINNED_REF.test(ref)) return 'not pinned to a full-length (40 char) commit SHA';
  if (!VERSION_COMMENT.test(comment)) return 'missing "# vX.Y.Z" version comment';
  return null;
}

function main() {
  const files = findFiles();
  const failures = [];
  let count = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { ref, comment } of extractUses(line)) {
        count += 1;
        const reason = checkRef(ref, comment);
        if (reason) failures.push({ rel, line: index + 1, ref, reason });
      }
    });
  }

  if (failures.length === 0) {
    console.log(
      `All ${count} action references in ${files.length} files are pinned to a commit SHA.`
    );
    process.exit(0);
    return;
  }

  console.error('GitHub Actions must be pinned to a full-length commit SHA:');
  for (const { rel, line, ref, reason } of failures) {
    console.error(`  ${rel}:${line}: ${ref} (${reason})`);
  }
  console.error('Pin pattern: uses: owner/repo@<40-char-commit-sha> # vX.Y.Z');
  console.error('  e.g. uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1');
  process.exit(1);
}

main();
