import { replacePathPrefix } from '../folder-path';

const setClient = (client: string) => {
  const raw = jest.fn((sql: string, bindings: unknown[]) => ({ sql, bindings }));

  global.strapi = {
    db: { dialect: { client }, connection: { raw } },
  } as any;

  return raw;
};

describe('replacePathPrefix', () => {
  test.each([
    ['sqlite', '? || SUBSTRING(??, ?)'],
    ['postgres', 'CONCAT(?::TEXT, SUBSTRING(??, ?::INTEGER))'],
    ['mysql', 'CONCAT(?, SUBSTRING(??, ?))'],
  ])('keeps everything after the old path on %s', (client, sql) => {
    const raw = setClient(client);

    replacePathPrefix('path', '/1', '/2/1');

    expect(raw).toHaveBeenCalledWith(sql, ['/2/1', 'path', 3]);
  });

  test('never uses REPLACE, which also rewrites later segments with the same start', () => {
    const raw = setClient('sqlite');

    replacePathPrefix('path', '/1', '/2/1');

    expect(raw.mock.calls[0][0]).not.toMatch(/REPLACE/i);
  });
});
