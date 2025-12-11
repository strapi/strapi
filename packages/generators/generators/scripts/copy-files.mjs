#!/usr/bin/env node

import { constants as fsConstants } from 'node:fs';
import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve the package root relative to this script.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceTargetPairs = [
  ['src/templates', 'dist/templates'],
  ['src/files', 'dist/files'],
];

const copyTree = async (source, target) => {
  try {
    await access(source, fsConstants.F_OK);
  } catch {
    return;
  }

  // Reset the destination to avoid stale assets.
  await rm(target, { recursive: true, force: true });
  await mkdir(path.dirname(target), { recursive: true });
  // Native recursive copy covers all files and directories.
  await cp(source, target, { recursive: true, force: true });
};

const main = async () => {
  // Ensure the dist folder exists before copying assets.
  await mkdir(path.join(root, 'dist'), { recursive: true });

  await Promise.all(
    sourceTargetPairs.map(async ([from, to]) => {
      const source = path.join(root, from);
      const target = path.join(root, to);
      await copyTree(source, target);
    })
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
