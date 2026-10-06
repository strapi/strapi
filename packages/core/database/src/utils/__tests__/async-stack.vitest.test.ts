import { afterEach, describe, expect, it } from 'vitest';

import { appendCallerStack } from '../async-stack';

// An error created on a timer has no async chain back to whoever awaits it, like knex's transaction start
const errorFromDetachedChain = () =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('timed out somewhere else')), 0);
  });

async function callerThatAppends() {
  try {
    await errorFromDetachedChain();
  } catch (error) {
    appendCallerStack(error);
    throw error;
  }
}

// `const result = await` keeps this frame in the async stack; the package lint forbids
// `return await` outside try/catch in tests
async function outerCaller() {
  const result = await callerThatAppends();
  return result;
}

async function nest(depth: number): Promise<void> {
  if (depth === 0) {
    await callerThatAppends();
    return;
  }
  await nest(depth - 1);
}

async function outermostCaller() {
  await nest(15);
}

describe('appendCallerStack', () => {
  const originalLimit = Error.stackTraceLimit;

  afterEach(() => {
    Error.stackTraceLimit = originalLimit;
  });

  it('appends the frames of the code awaiting the failed operation', async () => {
    const error = (await outerCaller().catch((e: Error) => e)) as Error;

    expect(error.message).toBe('timed out somewhere else');
    expect(error.stack).toContain('callerThatAppends');
    expect(error.stack).toContain('outerCaller');
  });

  it('keeps the original first line', async () => {
    const error = (await outerCaller().catch((e: Error) => e)) as Error;

    expect(error.stack?.split('\n')[0]).toBe('Error: timed out somewhere else');
  });

  it('captures more frames than the default limit and restores the limit', async () => {
    Error.stackTraceLimit = 10;

    const error = (await outermostCaller().catch((e: Error) => e)) as Error;

    expect(error.stack).toContain('outermostCaller');
    expect(Error.stackTraceLimit).toBe(10);
  });

  it('does nothing when stack traces are turned off', () => {
    Error.stackTraceLimit = 0;
    const error = new Error('no frames');
    const before = error.stack;

    appendCallerStack(error);

    expect(error.stack).toBe(before);
  });

  it('ignores values that are not errors', () => {
    expect(() => appendCallerStack('not an error')).not.toThrow();
  });
});
