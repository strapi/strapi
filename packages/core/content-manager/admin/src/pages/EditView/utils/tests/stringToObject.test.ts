import { stringToObject } from '../stringToObject';

describe('stringToObject', () => {
  test('should create a simple object from a single-level path', () => {
    const result = stringToObject('name', 'John');
    expect(result).toEqual({ name: 'John' });
  });

  test('should create a nested object from a multi-level path', () => {
    const result = stringToObject('user.profile.name', 'John');
    expect(result).toEqual({
      user: {
        profile: {
          name: 'John',
        },
      },
    });
  });

  test('should create an array when a numeric path part is encountered', () => {
    const result = stringToObject('users.0.name', 'John');
    expect(result).toEqual({
      users: [
        {
          name: 'John',
        },
      ],
    });
  });

  test('should handle sparse arrays', () => {
    const result = stringToObject('users.2.name', 'John');
    expect(result).toEqual({
      users: [
        {},
        {},
        {
          name: 'John',
        },
      ],
    });
  });

  test('should handle multiple array indices in the path', () => {
    const result = stringToObject('users.1.posts.2.title', 'Hello World');
    expect(result).toEqual({
      users: [
        {},
        {
          posts: [
            {},
            {},
            {
              title: 'Hello World',
            },
          ],
        },
      ],
    });
  });

  test('should handle complex object values', () => {
    const value = { id: 123, name: 'John', active: true };
    const result = stringToObject('user.details', value);
    expect(result).toEqual({
      user: {
        details: value,
      },
    });
  });

  test('should handle array values', () => {
    const value = [1, 2, 3];
    const result = stringToObject('data.numbers', value);
    expect(result).toEqual({
      data: {
        numbers: [1, 2, 3],
      },
    });
  });

  test('should match the specific example from the requirements', () => {
    const path = 'closingPeriod.dish.0.categories';
    const value = {
      connect: [
        {
          id: 'stx0lwur7gr95v3opmj1dspb',
          documentId: 'stx0lwur7gr95v3opmj1dspb',
          locale: 'en',
        },
      ],
    };

    const result = stringToObject(path, value);
    expect(result).toEqual({
      closingPeriod: {
        dish: [
          {
            categories: {
              connect: [
                {
                  id: 'stx0lwur7gr95v3opmj1dspb',
                  documentId: 'stx0lwur7gr95v3opmj1dspb',
                  locale: 'en',
                },
              ],
            },
          },
        ],
      },
    });
  });

  test('should handle empty path parts correctly', () => {
    const result = stringToObject('user..name', 'John');
    expect(result).toEqual({
      user: {
        '': {
          name: 'John',
        },
      },
    });
  });
});
