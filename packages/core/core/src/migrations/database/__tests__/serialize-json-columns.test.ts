import { serializeJsonColumns } from '../serialize-json-columns';

const componentMeta = {
  attributes: {
    title: { type: 'string', columnName: 'title' },
    payload: { type: 'json', columnName: 'payload' },
    nestedJson: { type: 'json', columnName: 'nested_json' },
    content: { type: 'blocks', columnName: 'content' },
    createdAt: { type: 'datetime', columnName: 'created_at' },
  },
};

describe('serializeJsonColumns', () => {
  it('stringifies json and blocks values that mysql2 returned as objects', () => {
    const payload = { foo: 'bar', n: 1 };
    const nestedJson = [{ id: 1 }, { id: 1 }];
    const content = [{ type: 'paragraph', children: [{ type: 'text', text: 'hello' }] }];
    const createdAt = new Date('2026-01-15T12:00:00.000Z');

    const row = {
      title: 'hero',
      payload,
      nested_json: nestedJson,
      content,
      created_at: createdAt,
    };

    serializeJsonColumns(row, componentMeta);

    expect(row.payload).toBe(JSON.stringify(payload));
    expect(row.nested_json).toBe(JSON.stringify(nestedJson));
    expect(row.content).toBe(JSON.stringify(content));
    expect(JSON.parse(row.payload)).toEqual(payload);
    expect(JSON.parse(row.nested_json)).toHaveLength(2);
    expect(row.title).toBe('hero');
    expect(row.created_at).toBe(createdAt);
  });

  it('leaves already-serialized strings and nulls unchanged', () => {
    const row = {
      payload: '{"foo":"bar"}',
      nested_json: null,
      content: undefined,
    };

    serializeJsonColumns(row, componentMeta);

    expect(row.payload).toBe('{"foo":"bar"}');
    expect(row.nested_json).toBeNull();
    expect(row.content).toBeUndefined();
  });

  it('looks up values by columnName, not the attribute key', () => {
    const row = {
      nestedJson: { ignored: true },
      nested_json: { kept: true },
    };

    serializeJsonColumns(row, componentMeta);

    expect(row.nestedJson).toEqual({ ignored: true });
    expect(row.nested_json).toBe('{"kept":true}');
  });

  it('is a no-op when metadata has no attributes', () => {
    const row = { payload: { foo: 'bar' } };

    expect(serializeJsonColumns(row, null)).toBe(row);
    expect(serializeJsonColumns(row, {})).toBe(row);
    expect(row.payload).toEqual({ foo: 'bar' });
  });
});
