import { getAttributesToDisplay } from '../index';

describe('ADMIN | utils | getAttributesToDisplay', () => {
  it('should return attributes without id and timestamps', () => {
    const contentType = {
      attributes: {
        id: { type: 'number' },
        title: { type: 'string' },
        description: { type: 'string' },
        createdAt: { type: 'timestamp' },
        updatedAt: { type: 'timestamp' },
        publishedAt: { type: 'timestamp' },
      },
      options: {
        timestamps: ['createdAt', 'updatedAt'],
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
