import { isDeadlockError } from '../transaction-context';

describe('isDeadlockError', () => {
  test('matches driver codes and a driver error that only kept the message', () => {
    expect(isDeadlockError(Object.assign(new Error('boom'), { code: '40P01' }))).toBe(true);
    expect(isDeadlockError({ errno: 1213, message: 'lock' })).toBe(true);
    expect(isDeadlockError({ sql: 'update t set a = 1', message: 'deadlock detected' })).toBe(true);
    expect(isDeadlockError({ message: 'wrapped', original: { code: 'ER_LOCK_DEADLOCK' } })).toBe(
      true
    );
  });

  test('ignores an application error that only mentions a deadlock', () => {
    expect(isDeadlockError(new Error('deadlock detected'))).toBe(false);
    expect(isDeadlockError(new Error('Deadlock found'))).toBe(false);
  });
});
