import {
  CONDITIONAL_FIELD_MULTI_DEP_SEPARATOR,
  CONDITIONAL_FIELD_STATIC_SUBSCRIPTION,
  getConditionDependencyPaths,
  getConditionDependencySubscriptionValue,
  getVarDependencyPath,
  serializeConditionDependency,
} from '../conditionalFields';

describe('conditionalFields', () => {
  describe('getVarDependencyPath', () => {
    it('returns a string path when operand is a non-empty string', () => {
      expect(getVarDependencyPath('title')).toBe('title');
    });

    it('returns a string path when operand is an array with string as first item', () => {
      expect(getVarDependencyPath(['author.name', 'fallback'])).toBe('author.name');
    });

    it('returns null for unsupported or empty operands', () => {
      expect(getVarDependencyPath('')).toBeNull();
      expect(getVarDependencyPath([])).toBeNull();
      expect(getVarDependencyPath([123])).toBeNull();
      expect(getVarDependencyPath({})).toBeNull();
    });
  });

  describe('getConditionDependencyPaths', () => {
    it('collects and sorts unique var dependency paths', () => {
      const condition = {
        and: [
          { '==': [{ var: 'title' }, 'Hello'] },
          { '==': [{ var: ['author.name', ''] }, 'Ada'] },
          { '!=': [{ var: 'title' }, 'Draft'] },
        ],
      };

      expect(getConditionDependencyPaths(condition as any)).toEqual(['author.name', 'title']);
    });

    it('returns an empty array when no var dependencies exist', () => {
      const condition = { '==': [1, 1] };

      expect(getConditionDependencyPaths(condition as any)).toEqual([]);
    });

    it('returns null when a var operand cannot be safely resolved', () => {
      expect(getConditionDependencyPaths({ '==': [{ var: '' }, true] } as any)).toBeNull();
      expect(getConditionDependencyPaths({ '==': [{ var: [] }, true] } as any)).toBeNull();
      expect(getConditionDependencyPaths({ '==': [{ var: {} }, true] } as any)).toBeNull();
    });
  });

  describe('serializeConditionDependency', () => {
    it('serializes primitive values with type prefix', () => {
      expect(serializeConditionDependency('abc')).toBe('string:"abc"');
      expect(serializeConditionDependency(12)).toBe('number:12');
      expect(serializeConditionDependency(null)).toBe('object:null');
    });
  });

  describe('getConditionDependencySubscriptionValue', () => {
    it('returns full values object when dependencies are unknown (null)', () => {
      const values = { title: 'Hello' };

      expect(getConditionDependencySubscriptionValue(values, null)).toBe(values);
    });

    it('returns static subscription token when there are no dependencies', () => {
      expect(getConditionDependencySubscriptionValue({ title: 'Hello' }, [])).toBe(
        CONDITIONAL_FIELD_STATIC_SUBSCRIPTION
      );
    });

    it('returns serialized value for a single dependency', () => {
      const values = { title: 'Hello' };

      expect(getConditionDependencySubscriptionValue(values, ['title'])).toBe('string:"Hello"');
    });

    it('returns joined serialized values for multiple dependencies', () => {
      const values = {
        author: { name: 'Ada' },
        title: 'Hello',
      };

      expect(getConditionDependencySubscriptionValue(values, ['author.name', 'title'])).toBe(
        `string:"Ada"${CONDITIONAL_FIELD_MULTI_DEP_SEPARATOR}string:"Hello"`
      );
    });
  });
});
