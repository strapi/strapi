import { updateValues, updateValuesWithPermissions } from '../updateValues';

describe('updateValues', () => {
  it('should not update the conditions values of given object', () => {
    const simpleObject = {
      properties: {
        enabled: true,
      },
      conditions: 'test',
    };
    const expected = {
      properties: {
        enabled: false,
      },
      conditions: 'test',
    };

    expect(updateValues(simpleObject, false)).toEqual(expected);
  });

  it('should update the conditions values if they are fields names', () => {
    const simpleObject = {
      conditions: 'test',
      properties: {
        fields: {
          description: false,
          restaurant: false,
          conditions: false,
        },
      },
    };
    const expected = {
      conditions: 'test',
      properties: {
        fields: {
          description: true,
          restaurant: true,
          conditions: true,
        },
      },
    };

    expect(updateValues(simpleObject, true)).toEqual(expected);
  });

  it('set the leafs of an object with the second argument passed to the function', () => {
    const complexeObject = {
      conditions: 'test',
      properties: {
        enabled: true,
        f1: {
          enabled: true,
          f1: {
            conditions: 'test',
            enabled: false,
            f2: {
              enabled: true,
            },
          },
        },
      },
    };
    const expected = {
      conditions: 'test',
      properties: {
        enabled: false,
        f1: {
          enabled: false,
          f1: {
            conditions: 'test',
            enabled: false,
            f2: {
              enabled: false,
            },
          },
        },
      },
    };

    expect(updateValues(complexeObject, false)).toEqual(expected);
  });
});

describe('updateValuesWithPermissions', () => {
  describe('when permissionChecker is undefined', () => {
    it('delegates to updateValues: sets all leaf values', () => {
      const obj = { properties: { enabled: false } };
      expect(updateValuesWithPermissions(obj, true, undefined)).toStrictEqual({
        properties: { enabled: true },
      });
    });

    it('delegates to updateValues: preserves conditions at root level', () => {
      const obj = { properties: { enabled: true }, conditions: 'test' };
      expect(updateValuesWithPermissions(obj, false, undefined)).toStrictEqual({
        properties: { enabled: false },
        conditions: 'test',
      });
    });

    it('delegates to updateValues: updates conditions inside fields', () => {
      const obj = {
        conditions: 'test',
        properties: { fields: { title: false, conditions: false } },
      };
      expect(updateValuesWithPermissions(obj, true, undefined)).toStrictEqual({
        conditions: 'test',
        properties: { fields: { title: true, conditions: true } },
      });
    });
  });

  describe('when permissionChecker is provided', () => {
    describe('leaf node handling', () => {
      it('sets leaf to valueToSet when permissionChecker returns true', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { enabled: false } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({ properties: { enabled: true } });
      });

      it('keeps current leaf value when permissionChecker returns false', () => {
        const permissionChecker = jest.fn().mockReturnValue(false);
        const obj = { properties: { enabled: false } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({ properties: { enabled: false } });
      });

      it('sets leaf to false (valueToSet=false) when permissionChecker returns true', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { enabled: true } };

        const result = updateValuesWithPermissions(obj, false, permissionChecker);

        expect(result).toStrictEqual({ properties: { enabled: false } });
      });

      it('keeps current true value when permissionChecker returns false and valueToSet is false', () => {
        const permissionChecker = jest.fn().mockReturnValue(false);
        const obj = { properties: { enabled: true } };

        const result = updateValuesWithPermissions(obj, false, permissionChecker);

        expect(result).toStrictEqual({ properties: { enabled: true } });
      });
    });

    describe('path building', () => {
      it('calls permissionChecker with the full nested path to the leaf', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { enabled: false } };

        updateValuesWithPermissions(obj, true, permissionChecker);

        expect(permissionChecker).toHaveBeenCalledWith(['properties', 'enabled']);
      });

      it('calls permissionChecker with the correct path for each leaf in a flat object', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { title: false, name: false } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({ properties: { title: true, name: true } });
        expect(permissionChecker).toHaveBeenCalledWith(['properties', 'title']);
        expect(permissionChecker).toHaveBeenCalledWith(['properties', 'name']);
      });

      it('calls permissionChecker with deeply nested path', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { a: { b: { c: false } } };

        updateValuesWithPermissions(obj, true, permissionChecker);

        expect(permissionChecker).toHaveBeenCalledWith(['a', 'b', 'c']);
      });
    });

    describe('conditions key handling', () => {
      it('preserves conditions at root level without calling permissionChecker', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { conditions: ['creator'], properties: { enabled: false } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({ conditions: ['creator'], properties: { enabled: true } });
        expect(permissionChecker).not.toHaveBeenCalledWith(['conditions']);
      });

      it('preserves conditions at nested non-field level without calling permissionChecker', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { enabled: false, conditions: ['creator'] } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({ properties: { enabled: true, conditions: ['creator'] } });
        expect(permissionChecker).not.toHaveBeenCalledWith(['properties', 'conditions']);
      });

      it('treats conditions inside fields as a field leaf and calls permissionChecker', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { fields: { title: false, conditions: false } } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({
          properties: { fields: { title: true, conditions: true } },
        });
        expect(permissionChecker).toHaveBeenCalledWith(['properties', 'fields', 'conditions']);
      });

      it('keeps conditions field value when permissionChecker returns false for it', () => {
        const permissionChecker = jest.fn((path: string[]) => {
          return path[path.length - 1] !== 'conditions';
        });
        const obj = { properties: { fields: { title: false, conditions: false } } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({
          properties: { fields: { title: true, conditions: false } },
        });
      });
    });

    describe('mixed permissions', () => {
      it('updates only permitted leaves, preserves others', () => {
        const permissionChecker = jest.fn((path: string[]) => {
          return path[path.length - 1] === 'title';
        });
        const obj = { properties: { fields: { title: false, name: false, slug: false } } };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({
          properties: { fields: { title: true, name: false, slug: false } },
        });
      });

      it('handles multiple actions with partial permissions', () => {
        const allowedPaths = new Set(['create.enabled', 'read.properties.fields.title']);
        const permissionChecker = jest.fn((path: string[]) => allowedPaths.has(path.join('.')));

        const obj = {
          create: { enabled: false },
          read: { enabled: false, properties: { fields: { title: false, name: false } } },
        };

        const result = updateValuesWithPermissions(obj, true, permissionChecker);

        expect(result).toStrictEqual({
          create: { enabled: true },
          read: { enabled: false, properties: { fields: { title: true, name: false } } },
        });
      });
    });

    describe('edge cases', () => {
      it('returns empty object for empty input', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        expect(updateValuesWithPermissions({}, true, permissionChecker)).toStrictEqual({});
        expect(permissionChecker).not.toHaveBeenCalled();
      });

      it('does not mutate the original object', () => {
        const permissionChecker = jest.fn().mockReturnValue(true);
        const obj = { properties: { enabled: false } };
        const original = JSON.parse(JSON.stringify(obj));

        updateValuesWithPermissions(obj, true, permissionChecker);

        expect(obj).toEqual(original);
      });
    });
  });
});
