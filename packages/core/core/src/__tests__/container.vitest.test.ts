import { describe, test, expect } from 'vitest';
import { Container } from '../container';

describe('Container.release', () => {
  test('drops registered and resolved services', () => {
    const container = new Container();
    container.add('value', 1);
    container.add('factory', () => ({ ok: true }));

    expect(container.get('value')).toBe(1);
    expect(container.get('factory')).toEqual({ ok: true });

    container.release();

    expect(container.has('value')).toBe(false);
    expect(container.has('factory')).toBe(false);
    expect(() => container.get('factory')).toThrow('Could not resolve service factory');
  });
});
