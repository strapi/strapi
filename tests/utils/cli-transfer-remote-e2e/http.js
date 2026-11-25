'use strict';

function getRemotePort() {
  return (
    process.env.CLI_TRANSFER_REMOTE_PORT || process.env.CLI_TRANSFER_PULL_REMOTE_PORT || '13710'
  );
}

async function waitForHttpOk(url, { timeoutMs = 180000 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) {
        return;
      }
    } catch {
      /* not up yet */
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

module.exports = {
  getRemotePort,
  waitForHttpOk,
};
