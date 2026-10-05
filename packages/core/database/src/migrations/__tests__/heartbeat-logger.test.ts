import { createHeartbeatLogger } from '../heartbeat';
import { transformLogMessage } from '../logger';

describe('createHeartbeatLogger', () => {
  it('does not emit before the interval elapses', () => {
    let now = 0;
    const log = jest.fn();
    const heartbeat = createHeartbeatLogger(log, {
      intervalMs: 60_000,
      now: () => now,
    });

    heartbeat.tick((elapsed) => `t=${elapsed}`);
    now = 59_999;
    heartbeat.tick((elapsed) => `t=${elapsed}`);

    expect(log).not.toHaveBeenCalled();
  });

  it('emits at most once per interval with elapsed seconds', () => {
    let now = 0;
    const log = jest.fn();
    const heartbeat = createHeartbeatLogger(log, {
      intervalMs: 60_000,
      now: () => now,
    });

    now = 60_000;
    heartbeat.tick((elapsed) => `still running (${elapsed}s)`);
    heartbeat.tick((elapsed) => `duplicate (${elapsed}s)`);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('still running (60s)');

    now = 120_000;
    heartbeat.tick((elapsed) => `still running (${elapsed}s)`);

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenLastCalledWith('still running (120s)');
  });
});

describe('transformLogMessage', () => {
  it('includes durationSeconds when present', () => {
    expect(
      transformLogMessage('info', {
        event: 'migrated',
        name: '5.0.0-02-created-document-id',
        durationSeconds: 12.4,
      })
    ).toEqual({
      level: 'info',
      message: '[internal migration]: migrated 5.0.0-02-created-document-id (12.400s)',
      timestamp: expect.any(Number),
    });
  });

  it('omits duration when not a finite number', () => {
    expect(
      transformLogMessage('info', {
        event: 'migrating',
        name: '5.0.0-02-created-document-id',
      })
    ).toEqual({
      level: 'info',
      message: '[internal migration]: migrating 5.0.0-02-created-document-id',
      timestamp: expect.any(Number),
    });
  });
});
