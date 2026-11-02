/**
 * Jest's vm `process` does not receive `unhandledRejection`. The Node process
 * outside the vm is jest-circus `parentProcess`, which is what a discarded
 * promise rejects on.
 */
const realProcess = (): NodeJS.Process => {
  const stateSymbol = Object.getOwnPropertySymbols(global).find((sym) =>
    String(sym).includes('JEST_STATE_SYMBOL')
  );
  const parent = stateSymbol
    ? (global as unknown as Record<symbol, { parentProcess?: NodeJS.Process }>)[stateSymbol]
        ?.parentProcess
    : undefined;

  return parent ?? process;
};

/**
 * Runs `run` and returns the reasons of the promise rejections nobody handled meanwhile.
 * In a running Strapi server, each of them would crash the process.
 */
export const collectUnhandledRejections = async (run: () => Promise<unknown>) => {
  const rejections: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    rejections.push(reason);
  };
  const rejectionProcess = realProcess();
  rejectionProcess.on('unhandledRejection', onUnhandled);

  try {
    await run();

    // Node reports unhandled rejections after the microtask queue drains
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    return rejections;
  } finally {
    rejectionProcess.off('unhandledRejection', onUnhandled);
  }
};
