import { classifyMcpToolRegistration } from '../classify-mcp-tool-registration';

const request = (method: string, extra: Record<string, unknown> = {}) => ({
  jsonrpc: '2.0',
  id: 1,
  method,
  ...extra,
});

describe('classifyMcpToolRegistration', () => {
  test.each([
    ['initialize', request('initialize')],
    ['ping', request('ping')],
    ['notification', { jsonrpc: '2.0', method: 'notifications/initialized' }],
    ['notification with a method prefix', request('notifications/cancelled')],
    ['unknown method', request('prompts/list')],
    ['malformed object', { foo: 'bar' }],
    ['null body', null],
    ['string body', 'tools/list'],
    ['empty batch', []],
    ['tools/list without an id', { jsonrpc: '2.0', method: 'tools/list' }],
    ['tools/call without a name', request('tools/call', { params: {} })],
    ['batch containing a malformed message', [request('tools/list'), { method: 1 }]],
    [
      'batch mixing tools/list and tools/call',
      [request('tools/list'), request('tools/call', { params: { name: 'get_article' } })],
    ],
  ])('registers no tool schemas for %s', (_label, body) => {
    expect(classifyMcpToolRegistration(body)).toEqual({ mode: 'none' });
  });

  test('registers every authorized tool for tools/list', () => {
    expect(classifyMcpToolRegistration(request('tools/list'))).toEqual({ mode: 'list' });
  });

  test('registers only the named tool for tools/call', () => {
    expect(
      classifyMcpToolRegistration(request('tools/call', { params: { name: 'list_article' } }))
    ).toEqual({ mode: 'call', names: new Set(['list_article']) });
  });

  test('registers the union of names for a batch of tools/call', () => {
    expect(
      classifyMcpToolRegistration([
        request('tools/call', { params: { name: 'get_article' } }),
        request('ping'),
        request('tools/call', { id: 2, params: { name: 'list_article' } }),
      ])
    ).toEqual({ mode: 'call', names: new Set(['get_article', 'list_article']) });
  });

  test('keeps tools/list when the batch also contains methods that need no tools', () => {
    expect(
      classifyMcpToolRegistration([
        request('initialize'),
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        request('tools/list'),
      ])
    ).toEqual({ mode: 'list' });
  });
});
