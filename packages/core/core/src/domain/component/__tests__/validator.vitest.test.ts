import { describe, it, expect } from 'vitest';
import { validateComponentLifecycles } from '../validator';
import { LIFECYCLES } from '../../lifecycles';

describe('validateComponentLifecycles', () => {
  it('accepts an empty module', () => {
    expect(validateComponentLifecycles('default.card', {})).toEqual({});
  });

  it('accepts every known hook as a function', () => {
    const lifecycles = Object.fromEntries(LIFECYCLES.map((hook) => [hook, () => {}]));

    expect(validateComponentLifecycles('default.card', lifecycles)).toBe(lifecycles);
  });

  it('rejects unknown hooks and names the component', () => {
    expect(() => validateComponentLifecycles('default.card', { beforeSave() {} })).toThrow(
      /Component lifecycles are invalid for default\.card\./
    );
  });

  it('rejects hooks that are not functions', () => {
    expect(() =>
      validateComponentLifecycles('default.card', { beforeCreate: 'not a function' })
    ).toThrow(/Component lifecycles are invalid for default\.card\./);
    expect(() => validateComponentLifecycles('default.card', { beforeCreate: null })).toThrow(
      /Component lifecycles are invalid for default\.card\./
    );
  });

  it('rejects a module that is not an object', () => {
    expect(() => validateComponentLifecycles('default.card', 'nope')).toThrow(
      /Component lifecycles are invalid for default\.card\./
    );
  });
});
