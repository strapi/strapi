import { getAttributesToDisplay } from '../index';

describe('ADMIN | utils | getAttributesToDisplay', () => {
  it('should return attributes without id and timestamps', () => {
    const attributes = {
      id: { type: 'number' },
      title: { type: 'string' },
      description: { type: 'string' },
      created_at: { type: 'timestamp' },
      updated_at: { type: 'timestamp' },
    };
    const actual = getAttributesToDisplay(attributes);
    const expectedAttributes = [
      { type: 'string', attributeName: 'title' },
      { type: 'string', attributeName: 'description' },
    ];
    expect(actual).toEqual(expectedAttributes);
  });
});
