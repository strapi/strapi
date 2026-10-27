import { describe, test, expect } from 'vitest';
import { resolveToolSchemaScope } from '../resolveToolSchemaScope';

describe('resolveToolSchemaScope', () => {
  test('initialize needs no tool schema', () => {
    const scope = resolveToolSchemaScope({ jsonrpc: '2.0', id: 1, method: 'initialize' });

    expect(scope).toEqual(new Set());
  });

  test('notifications need no tool schema', () => {
    const scope = resolveToolSchemaScope({ jsonrpc: '2.0', method: 'notifications/initialized' });

    expect(scope).toEqual(new Set());
  });

  test('tools/list needs every tool schema', () => {
    const scope = resolveToolSchemaScope({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    expect(scope).toBe('all');
  });

  test('tools/call needs only the called tool schema', () => {
    const scope = resolveToolSchemaScope({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_page', arguments: { documentId: 'abc' } },
    });

    expect(scope).toEqual(new Set(['get_page']));
  });

  test('a batch needs the union of its called tools', () => {
    const scope = resolveToolSchemaScope([
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_page' } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_article' } },
      { jsonrpc: '2.0', id: 3, method: 'ping' },
    ]);

    expect(scope).toEqual(new Set(['get_page', 'list_article']));
  });

  test('a batch containing tools/list needs every tool schema', () => {
    const scope = resolveToolSchemaScope([
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_page' } },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ]);

    expect(scope).toBe('all');
  });

  test.each([
    ['a tools/call without params', { jsonrpc: '2.0', id: 1, method: 'tools/call' }],
    [
      'a tools/call with a non-string name',
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 42 } },
    ],
    ['a null body', null],
    ['a string body', 'not json-rpc'],
  ])('%s falls back to every tool schema', (_label, body) => {
    expect(resolveToolSchemaScope(body)).toBe('all');
  });
});
