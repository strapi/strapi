import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error - no .ts extension import
import { sync, unlink, status, makeLogger } from './links.ts';

// Derive repo root from the script's own location — works regardless of cwd.
// @ts-expect-error - import.meta.url is not supported in commonjs context
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const COMMANDS = { sync, unlink, status } as const;
type Command = keyof typeof COMMANDS;

const cmd = process.argv[2];

if (cmd === undefined || cmd in COMMANDS === false) {
  console.error('Usage: tsx scripts/ai-tooling/index.ts <sync|unlink|status>');
  process.exit(2);
}

const log = makeLogger();
const exitCode = COMMANDS[cmd as Command](repoRoot, log);
process.exit(exitCode);
