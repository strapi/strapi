import { getIn, setIn, isObject } from '../objects';

describe('object', () => {
  describe('getIn', () => {
    const obj = {
      a: {
        b: 2,
        c: false,
        d: null,
      },
      t: true,
      s: 'a random string',
    };

    it('gets a value by array path', () => {
      expect(getIn(obj, ['a', 'b'])).toBe(2);
    });

    it('gets a value by string path', () => {
      expect(getIn(obj, 'a.b')).toBe(2);
    });

    it('return "undefined" if value was not found using given path', () => {
      expect(getIn(obj, 'a.z')).toBeUndefined();
    });

    it('return "undefined" if value was not found using given path and an intermediate value is "false"', () => {
      expect(getIn(obj, 'a.c.z')).toBeUndefined();
    });

    it('return "undefined" if value was not found using given path and an intermediate value is "null"', () => {
      expect(getIn(obj, 'a.d.z')).toBeUndefined();
    });

    it('return "undefined" if value was not found using given path and an intermediate value is "true"', () => {
      expect(getIn(obj, 't.z')).toBeUndefined();
    });

    it('return "undefined" if value was not found using given path and an intermediate value is a string', () => {
      expect(getIn(obj, 's.z')).toBeUndefined();
    });
  });

  describe('setIn', () => {
    it('sets flat value', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'flat', 'value');
      expect(obj).toEqual({ x: 'y' });
      expect(newObj).toEqual({ x: 'y', flat: 'value' });
    });

    it('keep the same object if nothing is changed', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'x', 'y');
      expect(obj).toBe(newObj);
    });

    it('removes flat value', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'x', undefined);
      expect(obj).toEqual({ x: 'y' });
      expect(newObj).toEqual({});
      expect(newObj).not.toHaveProperty('x');
    });

    it('sets nested value', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'nested.value', 'nested value');
      expect(obj).toEqual({ x: 'y' });
      expect(newObj).toEqual({ x: 'y', nested: { value: 'nested value' } });
    });

    it('updates nested value', () => {
      const obj = { x: 'y', nested: { value: 'a' } };
      const newObj = setIn(obj, 'nested.value', 'b');
      expect(obj).toEqual({ x: 'y', nested: { value: 'a' } });
      expect(newObj).toEqual({ x: 'y', nested: { value: 'b' } });
    });

    it('removes nested value', () => {
      const obj = { x: 'y', nested: { value: 'a' } };
      const newObj = setIn(obj, 'nested.value', undefined);
      expect(obj).toEqual({ x: 'y', nested: { value: 'a' } });
      expect(newObj).toEqual({ x: 'y', nested: {} });
      expect(newObj.nested).not.toHaveProperty('value');
    });

    it('updates deep nested value', () => {
      const obj = { x: 'y', twofoldly: { nested: { value: 'a' } } };
      const newObj = setIn(obj, 'twofoldly.nested.value', 'b');
      expect(obj.twofoldly.nested === newObj.twofoldly.nested).toEqual(false); // fails, same object still
      expect(obj).toEqual({ x: 'y', twofoldly: { nested: { value: 'a' } } }); // fails, it's b here, too
      expect(newObj).toEqual({ x: 'y', twofoldly: { nested: { value: 'b' } } }); // works ofc
    });

    it('removes deep nested value', () => {
      const obj = { x: 'y', twofoldly: { nested: { value: 'a' } } };
      const newObj = setIn(obj, 'twofoldly.nested.value', undefined);
      expect(obj.twofoldly.nested === newObj.twofoldly.nested).toEqual(false);
      expect(obj).toEqual({ x: 'y', twofoldly: { nested: { value: 'a' } } });
      expect(newObj).toEqual({ x: 'y', twofoldly: { nested: {} } });
      expect(newObj.twofoldly.nested).not.toHaveProperty('value');
    });

    it('shallow clone data along the update path', () => {
      const obj = {
        x: 'y',
        twofoldly: { nested: ['a', { c: 'd' }] },
        other: { nestedOther: 'o' },
      };
      const newObj = setIn(obj, 'twofoldly.nested.0', 'b');
      // All new objects/arrays created along the update path.
      expect(obj).not.toBe(newObj);
      expect(obj.twofoldly).not.toBe(newObj.twofoldly);
      expect(obj.twofoldly.nested).not.toBe(newObj.twofoldly.nested);
      // All other objects/arrays copied, not cloned (retain same memory
      // location).
      expect(obj.other).toBe(newObj.other);
      expect(obj.twofoldly.nested[1]).toBe(newObj.twofoldly.nested[1]);
    });

    it('sets new array', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'nested.0', 'value');
      expect(obj).toEqual({ x: 'y' });
      expect(newObj).toEqual({ x: 'y', nested: ['value'] });
    });

    it('updates nested array value', () => {
      const obj = { x: 'y', nested: ['a'] };
      const newObj = setIn(obj, 'nested[0]', 'b');
      expect(obj).toEqual({ x: 'y', nested: ['a'] });
      expect(newObj).toEqual({ x: 'y', nested: ['b'] });
    });

    it('adds new item to nested array', () => {
      const obj = { x: 'y', nested: ['a'] };
      const newObj = setIn(obj, 'nested.1', 'b');
      expect(obj).toEqual({ x: 'y', nested: ['a'] });
      expect(newObj).toEqual({ x: 'y', nested: ['a', 'b'] });
    });

    it('sticks to object with int key when defined', () => {
      const obj = { x: 'y', nested: { 0: 'a' } };
      const newObj = setIn(obj, 'nested.0', 'b');
      expect(obj).toEqual({ x: 'y', nested: { 0: 'a' } });
      expect(newObj).toEqual({ x: 'y', nested: { 0: 'b' } });
    });

    it('supports path containing key of the object', () => {
      const obj = { x: 'y' };
      const newObj = setIn(obj, 'a.x.c', 'value');
      expect(obj).toEqual({ x: 'y' });
      expect(newObj).toEqual({ x: 'y', a: { x: { c: 'value' } } });
    });

    it('can convert primitives to objects before setting', () => {
      const obj = { x: [{ y: true }] };
      const newObj = setIn(obj, 'x.0.y.z', true);
      expect(obj).toEqual({ x: [{ y: true }] });
      expect(newObj).toEqual({ x: [{ y: { z: true } }] });
    });
  });

  describe('isObject', () => {
    it('should return true if the given value is an object', () => {
      expect(isObject({})).toBeTruthy();
    });
    it('should return false is the given value is not an object', () => {
      expect(isObject(1)).toBeFalsy();
      expect(isObject('')).toBeFalsy();
      expect(isObject([])).toBeFalsy();
      expect(isObject(null)).toBeFalsy();
      expect(isObject(undefined)).toBeFalsy();
    });
  });
});
