import { afterEach, describe, expect, it } from 'vitest';

import { deepenStack } from '../stack';

const failsInsideKnex = async (): Promise<never> => {
  await Promise.resolve();
  throw new Error('Knex: Timeout acquiring a connection.');
};

async function wrapper() {
  try {
    return await failsInsideKnex();
  } catch (error) {
    deepenStack(error as Error);
    throw error;
  }
}

async function nest(depth: number): Promise<unknown> {
  const result = depth === 0 ? await wrapper() : await nest(depth - 1);
  return result;
}

async function outermostCaller() {
  const result = await nest(15);
  return result;
}

describe('deepenStack', () => {
  const originalLimit = Error.stackTraceLimit;
  const originalPrepareStackTrace = Error.prepareStackTrace;

  afterEach(() => {
    Error.stackTraceLimit = originalLimit;
    Error.prepareStackTrace = originalPrepareStackTrace;
  });

  it('keeps frames beyond the default limit of 10 and restores the limit', async () => {
    Error.stackTraceLimit = 10;

    const error = (await outermostCaller().catch((e: Error) => e)) as Error;

    expect(error.stack).toContain('outermostCaller');
    expect(Error.stackTraceLimit).toBe(10);
  });

  it('keeps the header and the frame where the error was created', async () => {
    const error = (await outermostCaller().catch((e: Error) => e)) as Error;
    const lines = (error.stack ?? '').split('\n');

    expect(lines[0]).toBe('Error: Knex: Timeout acquiring a connection.');
    expect(lines[1]).toContain('failsInsideKnex');
    expect(lines[2]).toContain('wrapper');
  });

  it('does nothing when stack traces are turned off', () => {
    // Created with frames at the default limit, so only the guard can keep the stack untouched
    const error = new Error('has frames');
    const before = error.stack;

    Error.stackTraceLimit = 0;
    deepenStack(error);
    expect(error.stack).toBe(before);

    Error.stackTraceLimit = -1;
    deepenStack(error);
    expect(error.stack).toBe(before);
  });

  it('leaves the stack alone when another library makes stacks non-strings', () => {
    Error.prepareStackTrace = (_error, callSites) => callSites as unknown as string;

    const error = new Error('x');
    Object.defineProperty(error, 'stack', {
      value: 'Error: x\n    at known',
      writable: true,
      configurable: true,
    });

    expect(() => deepenStack(error)).not.toThrow();
    expect(error.stack).toBe('Error: x\n    at known');
  });
});
