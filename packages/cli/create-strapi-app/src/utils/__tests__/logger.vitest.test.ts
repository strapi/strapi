import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../logger';

describe('logger.fatalAfterFlush', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits only after stderr accepted the message', async () => {
    let flush: (() => void) | undefined;
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(((
      _chunk: unknown,
      callback?: () => void
    ) => {
      flush = callback;
      return false;
    }) as typeof process.stderr.write);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);

    const done = logger.fatalAfterFlush(['Something failed', 'Run this command']);
    await new Promise(setImmediate);

    expect(write).toHaveBeenCalledWith(
      expect.stringMatching(/Something failed\n\s+Run this command\n\n$/),
      expect.any(Function)
    );
    expect(exit).not.toHaveBeenCalled();

    flush?.();
    await done;

    expect(exit).toHaveBeenCalledWith(1);
  });
});
