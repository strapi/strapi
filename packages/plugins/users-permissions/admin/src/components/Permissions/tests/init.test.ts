import { describe, it, expect } from 'vitest';

import { init } from '../init';

describe('USERS PERMISSIONS | COMPONENTS | Permissions | init', () => {
  it('should return the initialState and an empty collapses array if the permissions object is empty', () => {
    const initialState = {
      collapses: [],
    };
    const expected = {
      collapses: [],
    };

    expect(init(initialState, {})).toEqual(expected);
  });

  it('should return an object with a sorted array of permissions', () => {
    const permissions = {
      zgraphql: { controllers: {} },
      app: { controllers: {} },
      graphql: { controllers: {} },
    };

    const expected = {
      collapses: [
        { name: 'app', isOpen: false },
        { name: 'graphql', isOpen: false },
        { name: 'zgraphql', isOpen: false },
      ],
    };

    expect(init({ collapses: [] }, permissions)).toEqual(expected);
  });
});
