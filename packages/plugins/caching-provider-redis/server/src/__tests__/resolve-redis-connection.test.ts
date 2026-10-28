import { resolveRedisConnection } from '../resolve-redis-connection';

describe('resolveRedisConnection', () => {
  it('accepts a URL string', () => {
    expect(resolveRedisConnection({ connection: 'redis://localhost:6379' })).toBe(
      'redis://localhost:6379'
    );
  });

  it('accepts connection.url', () => {
    expect(resolveRedisConnection({ connection: { url: 'redis://127.0.0.1:6380' } })).toBe(
      'redis://127.0.0.1:6380'
    );
  });

  it('passes through host-style options', () => {
    expect(resolveRedisConnection({ connection: { host: 'h', port: 6379 } })).toEqual({
      host: 'h',
      port: 6379,
    });
  });

  it('throws when connection is missing', () => {
    expect(() => resolveRedisConnection({})).toThrow(/connection/);
  });
});
