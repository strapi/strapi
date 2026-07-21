import { describe, it, expect } from 'vitest';

import {
  sanitizeRouteForSerialization,
  sanitizeRoutesArrayForSerialization,
  sanitizeRoutesMapForSerialization,
} from '../route-serialization';

describe('route-serialization', () => {
  it('sanitizeRouteForSerialization strips request and response', () => {
    const route = {
      method: 'GET',
      path: '/articles',
      request: { query: {} },
      response: { schema: {} },
      handler: 'article.find',
    };

    expect(sanitizeRouteForSerialization(route)).toEqual({
      method: 'GET',
      path: '/articles',
      handler: 'article.find',
    });
  });

  it('sanitizeRoutesArrayForSerialization filters invalid entries', () => {
    const routes = [
      { method: 'GET', path: '/a' },
      null,
      undefined,
      'invalid',
      { method: 'POST', path: '/b', request: {}, response: {} },
    ];

    expect(sanitizeRoutesArrayForSerialization(routes)).toEqual([
      { method: 'GET', path: '/a' },
      { method: 'POST', path: '/b' },
    ]);
  });

  it('sanitizeRoutesMapForSerialization sanitizes each route array', () => {
    const map = {
      'api::article.article': [{ method: 'GET', path: '/articles', request: {}, response: {} }],
      other: 'passthrough',
    };

    expect(sanitizeRoutesMapForSerialization(map)).toEqual({
      'api::article.article': [{ method: 'GET', path: '/articles' }],
      other: 'passthrough',
    });
  });
});
