import { buildSessionMetadata, sanitizeSessionEntry, sortSessionsForDisplay } from '../sessions';

describe('sessions utils', () => {
  describe('sanitizeSessionEntry', () => {
    it('maps session fields and flags the current session', () => {
      const result = sanitizeSessionEntry(
        {
          sessionId: 'session-a',
          deviceId: 'device-a',
          createdAt: '2026-06-12T10:00:00.000Z',
          metadata: {
            loginAt: '2026-06-12T08:00:00.000Z',
            deviceName: 'Chrome on macOS',
          },
        },
        'session-a'
      );

      expect(result).toEqual({
        id: 'session-a',
        deviceId: 'device-a',
        deviceName: 'Chrome on macOS',
        current: true,
        loginAt: '2026-06-12T08:00:00.000Z',
        lastActiveAt: '2026-06-12T10:00:00.000Z',
      });
    });

    it('ignores invalid metadata types', () => {
      const result = sanitizeSessionEntry({
        sessionId: 'session-b',
        metadata: {
          loginAt: 123,
          deviceName: false,
        },
      });

      expect(result).toEqual({
        id: 'session-b',
        deviceId: undefined,
        deviceName: undefined,
        current: false,
        loginAt: undefined,
        lastActiveAt: undefined,
      });
    });
  });

  describe('buildSessionMetadata', () => {
    it('captures login time and a derived device label without ip', () => {
      const result = buildSessionMetadata({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        loginAt: '2026-06-12T08:00:00.000Z',
      });

      expect(result).toEqual({
        loginAt: '2026-06-12T08:00:00.000Z',
        deviceName: 'Chrome on macOS',
      });
      expect(result).not.toHaveProperty('ip');
    });
  });

  describe('sortSessionsForDisplay', () => {
    it('puts the current session first, then most recently used', () => {
      const sorted = sortSessionsForDisplay([
        { id: 'old', current: false, lastActiveAt: '2026-06-10T08:00:00.000Z' },
        { id: 'current', current: true, lastActiveAt: '2026-06-11T08:00:00.000Z' },
        { id: 'recent', current: false, lastActiveAt: '2026-06-12T08:00:00.000Z' },
      ] as Array<{ id: string; current: boolean; lastActiveAt?: string }>);

      expect(sorted.map((session) => session.id)).toEqual(['current', 'recent', 'old']);
    });
  });
});
