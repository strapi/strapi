import { describe, it, expect } from 'vitest';
import { validateComponentLifecycles } from '../validator';
import { LIFECYCLES } from '../../lifecycles';

describe('validateComponentLifecycles', () => {
  it('accepts an empty module', () => {
    expect(validateComponentLifecycles('default.card', {})).toEqual({
      lifecycles: {},
      warnings: [],
    });
  });

  it('keeps every known hook, as the loader did before', () => {
    const hooks = Object.fromEntries(LIFECYCLES.map((hook) => [hook, () => {}]));

    expect(validateComponentLifecycles('default.card', hooks).lifecycles).toEqual(hooks);
  });

  it('warns that the *DeleteMany hooks never run on deletion by the document service', () => {
    const { lifecycles, warnings } = validateComponentLifecycles('default.card', {
      afterDeleteMany() {},
    });

    expect(Object.keys(lifecycles)).toEqual(['afterDeleteMany']);
    expect(warnings).toEqual([
      '"afterDeleteMany" never runs when the document service deletes this component, only on a direct deleteMany query on it',
    ]);
  });

  it('leaves out an export named like a hook, with a warning', () => {
    const { lifecycles, warnings } = validateComponentLifecycles('default.card', {
      beforeSave() {},
    });

    expect(lifecycles).toEqual({});
    expect(warnings).toEqual(['"beforeSave" is not a lifecycle hook and is ignored']);
  });

  it('leaves out other exports, such as helpers, without a warning', () => {
    expect(validateComponentLifecycles('default.card', { formatName() {}, LIMIT: 3 })).toEqual({
      lifecycles: {},
      warnings: [],
    });
  });

  it('ignores a hook set to null or undefined', () => {
    expect(
      validateComponentLifecycles('default.card', { beforeCreate: null, afterCreate: undefined })
    ).toEqual({ lifecycles: {}, warnings: [] });
  });

  it('rejects a hook that is not a function and names the component', () => {
    expect(() =>
      validateComponentLifecycles('default.card', { beforeCreate: 'not a function' })
    ).toThrow(
      'Component lifecycles are invalid for default.card: "beforeCreate" must be a function.'
    );
  });

  it.each(['nope', null, () => {}, []])(
    'rejects lifecycles that are not an object (%s)',
    (value) => {
      expect(() => validateComponentLifecycles('default.card', value)).toThrow(
        'Component lifecycles are invalid for default.card: they must be an object of hooks.'
      );
    }
  );
});
