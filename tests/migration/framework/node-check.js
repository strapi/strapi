'use strict';

function getNodeMajor() {
  return Number(process.version.slice(1).split('.')[0]);
}

/**
 * @param {number | undefined} requiredMajor
 * @param {string} flagName e.g. initial-node
 */
function assertNodeMajor(requiredMajor, flagName) {
  if (requiredMajor == null || !Number.isFinite(requiredMajor)) {
    return;
  }
  const cur = getNodeMajor();
  if (cur !== requiredMajor) {
    console.error(
      `\n❌ Node major mismatch: running ${process.version} (major ${cur}), ` +
        `but --${flagName} requires major ${requiredMajor}. ` +
        `Switch Node and re-run (e.g. nvm use ${requiredMajor}).\n`
    );
    process.exit(1);
  }
}

module.exports = { getNodeMajor, assertNodeMajor };
