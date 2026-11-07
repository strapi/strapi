const path = require('path');
const execa = require('execa');

function getNodeMajor(): number {
  return Number(process.version.slice(1).split('.')[0]);
}

/**
 * Major version of an arbitrary Node executable (e.g. the baseline runtime passed via --initial-node-bin).
 */
function getNodeMajorForBinary(nodeBin: string): number {
  if (nodeBin === process.execPath) {
    return getNodeMajor();
  }
  const { stdout } = execa.sync(nodeBin, ['-p', 'process.versions.node']);
  return Number(String(stdout).trim().split('.')[0]);
}

/**
 * @param requiredMajor
 * @param flagName e.g. initial-node
 * @param nodeBin Node executable to check (defaults to the current process)
 */
function assertNodeMajor(
  requiredMajor: number | undefined,
  flagName: string,
  nodeBin: string = process.execPath
): void {
  if (requiredMajor == null || !Number.isFinite(requiredMajor)) {
    return;
  }
  const cur = getNodeMajorForBinary(nodeBin);
  if (cur !== requiredMajor) {
    const runtime = nodeBin === process.execPath ? `running ${process.version}` : nodeBin;
    console.error(
      `\n❌ Node major mismatch: ${runtime} (major ${cur}), ` +
        `but --${flagName} requires major ${requiredMajor}. ` +
        `Switch Node and re-run (e.g. nvm use ${requiredMajor}).\n`
    );
    process.exit(1);
  }
}

/**
 * Env for child processes that must run on `nodeBin`: prepends its directory to PATH so
 * `#!/usr/bin/env node` shims (yarn, lifecycle scripts, native addon builds) resolve to it too.
 * When the runner was started through `yarn`, PATH also holds Yarn's temporary bin folder whose
 * `node` / `yarn` shims hardcode the host Node, so that folder is dropped.
 */
function envForNodeBinary(nodeBin: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (nodeBin === process.execPath) {
    return env;
  }
  const berryBinFolder = env.BERRY_BIN_FOLDER;
  const inheritedPath = (env.PATH ?? '')
    .split(path.delimiter)
    .filter((entry) => entry && entry !== berryBinFolder);
  const next: NodeJS.ProcessEnv = {
    ...env,
    PATH: [path.dirname(nodeBin), ...inheritedPath].join(path.delimiter),
  };
  delete next.BERRY_BIN_FOLDER;
  delete next.npm_execpath;
  delete next.npm_node_execpath;
  return next;
}

module.exports = {
  getNodeMajor,
  getNodeMajorForBinary,
  assertNodeMajor,
  envForNodeBinary,
};
