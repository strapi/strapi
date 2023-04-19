import { renderHook } from '@testing-library/react-hooks';

import { useFilter } from '../useFilter';

describe('useFilter', () => {
  it("should return an object with the properties 'startsWith', 'endsWith, & 'includes'", () => {
    const { result } = renderHook(() => useFilter('en'));

    expect(result.current).toHaveProperty('startsWith');
    expect(result.current).toHaveProperty('endsWith');
    expect(result.current).toHaveProperty('includes');
  });

  describe('startsWith', () => {
    it('should return true if the substring is empty', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.startsWith('foo', '')).toBe(true);
    });

    it('should return true if the string starts with the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.startsWith('foo', 'f')).toBe(true);
    });

    it('should return false if the string does not start with the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.startsWith('foo', 'o')).toBe(false);
    });
  });

  describe('endsWith', () => {
    it('should return true if the substring is empty', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.endsWith('foo', '')).toBe(true);
    });

    it('should return true if the string ends with the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.endsWith('foo', 'o')).toBe(true);
    });

    it('should return false if the string does not end with the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.endsWith('foo', 'f')).toBe(false);
    });
  });

  describe('includes', () => {
    it('should return true if the substring is empty', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.includes('foo', '')).toBe(true);
    });

    it('should return true if the string includes the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.includes('foo', 'o')).toBe(true);
    });

    it('should return false if the string does not include the substring', () => {
      const { result } = renderHook(() => useFilter('en'));

      expect(result.current.includes('foo', 'b')).toBe(false);
    });
  });
});
