import { getAttributesToDisplay } from '../index';

describe('ADMIN | utils | getAttributesToDisplay', () => {
  it('should return attributes without id and timestamps', () => {
    const contentType = {
      attributes: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        created_at: { type: 'timestamp' },
        updated_at: { type: 'timestamp' },
        published_at: { type: 'timestamp' },
      },
      options: {
        timestamps: ['created_at', 'updated_at'],
      },
    };
    const actual = getAttributesToDisplay(contentType);
    const expectedAttributes = [
      { type: 'string', attributeName: 'title' },
      { type: 'string', attributeName: 'description' },
    ];
    expect(actual).toEqual(expectedAttributes);
  });
});
