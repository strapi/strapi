import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('resolves when promise resolves before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = withTimeout(promise, 1000, 'test-operation');

    await expect(result).resolves.toBe('success');
  });

  test('rejects when timeout is reached before promise resolves', async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 2000);
    });
    const result = withTimeout(promise, 1000, 'test-operation');

    jest.advanceTimersByTime(1000);

    await expect(result).rejects.toThrow("Operation 'test-operation' timed out after 1000ms");
  });

  test('error message includes operation name and timeout duration', async () => {
    const promise = new Promise<string>(() => {
      // Never resolves
    });
    const result = withTimeout(promise, 500, 'my-custom-operation');

    jest.advanceTimersByTime(500);

    await expect(result).rejects.toThrow("Operation 'my-custom-operation' timed out after 500ms");
  });

  test('rejects with original error when promise rejects before timeout', async () => {
    const originalError = new Error('Original error message');
    const promise = Promise.reject(originalError);
    const result = withTimeout(promise, 1000, 'reject-op');

    await expect(result).rejects.toThrow('Original error message');
  });

  test('handles promise rejection after timeout', async () => {
    let rejectPromise: (error: Error) => void;
    const promise = new Promise<string>((_, reject) => {
      rejectPromise = reject;
    });
    const result = withTimeout(promise, 1000, 'delayed-reject');

    jest.advanceTimersByTime(1000);

    // Timeout should win the race
    await expect(result).rejects.toThrow("Operation 'delayed-reject' timed out after 1000ms");

    // Rejecting after timeout should not affect the result
    rejectPromise!(new Error('Too late'));
  });

  test('handles promise that resolves after timeout', async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    const result = withTimeout(promise, 1000, 'delayed-resolve');

    jest.advanceTimersByTime(1000);

    // Timeout should win the race
    await expect(result).rejects.toThrow("Operation 'delayed-resolve' timed out after 1000ms");

    // Resolving after timeout should not affect the result
    resolvePromise!('Too late');
  });

  test('handles zero timeout before promise resolves', async () => {
    const promise = new Promise(() => {
      // Never resolves
    });
    const result = withTimeout(promise, 0, 'zero-timeout');

    jest.advanceTimersByTime(0);

    await expect(result).rejects.toThrow("Operation 'zero-timeout' timed out after 0ms");
  });

  test('handles zero timeout after promise resolves', async () => {
    const promise = new Promise<string>((resolve) => {
      resolve('success');
    });
    const result = withTimeout(promise, 0, 'zero-timeout');

    jest.advanceTimersByTime(0);

    await expect(result).resolves.toBe('success');
  });

  test('preserves promise value when resolved quickly', async () => {
    const promise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(123), 100);
    });
    const result = withTimeout(promise, 1000, 'quick-resolve');

    jest.advanceTimersByTime(100);

    await expect(result).resolves.toBe(123);
  });
});
