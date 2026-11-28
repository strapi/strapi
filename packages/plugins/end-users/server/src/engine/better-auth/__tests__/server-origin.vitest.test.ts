import { describe, expect, it } from 'vitest';

import { resolveServerOrigin } from '../server-origin';

const config = (values: Record<string, unknown>) => ({ get: (path: string) => values[path] });

describe('resolveServerOrigin', () => {
  it('is the origin of server.url', () => {
    expect(resolveServerOrigin(config({ 'server.url': 'https://api.example.com' }))).toBe(
      'https://api.example.com'
    );
  });

  it('drops the path, the query and a trailing slash', () => {
    expect(
      resolveServerOrigin(config({ 'server.url': 'https://api.example.com/strapi/?x=1' }))
    ).toBe('https://api.example.com');
  });

  it('keeps a port', () => {
    expect(resolveServerOrigin(config({ 'server.url': 'http://localhost:8080/' }))).toBe(
      'http://localhost:8080'
    );
  });

  it('prefers server.url to server.absoluteUrl', () => {
    expect(
      resolveServerOrigin(
        config({
          'server.url': 'https://api.example.com',
          'server.absoluteUrl': 'http://localhost:1337',
        })
      )
    ).toBe('https://api.example.com');
  });

  it('falls back to server.absoluteUrl when server.url is empty, relative or not a web address', () => {
    for (const url of [undefined, '', '/strapi', 'not a url', 'ftp://files.example.com']) {
      expect(
        resolveServerOrigin(
          config({ 'server.url': url, 'server.absoluteUrl': 'http://localhost:1337' })
        ),
        String(url)
      ).toBe('http://localhost:1337');
    }
  });

  it('refuses to answer when there is no address, and names the setting', () => {
    expect(() => resolveServerOrigin(config({}))).toThrow(/set server\.url/);
    expect(() =>
      resolveServerOrigin(config({ 'server.url': '', 'server.absoluteUrl': '/relative' }))
    ).toThrow(/set server\.url/);
  });
});
