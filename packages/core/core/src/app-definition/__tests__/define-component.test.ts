import { defineComponent } from '../define-component';
import { normalizeComponent, buildComponentMap } from '../normalize';
import * as is from '../attributes';
import type { AppComponent } from '../types';

const dish: AppComponent = {
  uid: 'default.dish',
  displayName: 'Dish',
  attributes: { name: is.string({ required: true }), price: is.decimal() },
};

describe('defineComponent', () => {
  it('returns the validated component untouched', () => {
    expect(defineComponent(dish)).toBe(dish);
  });

  it.each([
    [{ ...dish, uid: undefined }, /uid/],
    [{ ...dish, uid: 'dish' }, /<category>\.<name>/],
    [{ ...dish, uid: 'a.b.c' }, /<category>\.<name>/],
    [{ ...dish, uid: 'Default.dish' }, /kebab-case/],
    [{ ...dish, uid: 'default.Dish' }, /kebab-case/],
    [{ ...dish, displayName: undefined }, /displayName/],
    [{ ...dish, attributes: undefined }, /attributes/],
  ])('throws a clear error for invalid input %#', (input, matcher) => {
    expect(() => defineComponent(input as AppComponent)).toThrow(matcher);
  });

  it('accepts kebab-case category and name segments', () => {
    const comp = defineComponent({ ...dish, uid: 'shared-blocks.call-to-action' });
    expect(comp.uid).toBe('shared-blocks.call-to-action');
  });
});

describe('normalizeComponent', () => {
  it('builds a component schema mirroring the file-based loader', () => {
    const { uid, schema } = normalizeComponent(dish);

    expect(uid).toBe('default.dish');
    expect(schema).toMatchObject({
      uid: 'default.dish',
      category: 'default',
      modelType: 'component',
      modelName: 'dish',
      globalId: 'ComponentDefaultDish',
      collectionName: 'components_default_dish',
      info: { displayName: 'Dish' },
      attributes: { name: { type: 'string', required: true }, price: { type: 'decimal' } },
    });
  });

  it('respects an explicit collectionName, globalId, icon and description', () => {
    const { schema } = normalizeComponent({
      ...dish,
      collectionName: 'cmps_dishes',
      globalId: 'MyDish',
      icon: 'cutlery',
      description: 'A dish',
    });

    expect(schema.collectionName).toBe('cmps_dishes');
    expect(schema.globalId).toBe('MyDish');
    expect(schema.info).toMatchObject({ icon: 'cutlery', description: 'A dish' });
  });

  it('snake-cases kebab-case uid segments in the default collectionName', () => {
    const { schema } = normalizeComponent({ ...dish, uid: 'shared-blocks.call-to-action' });
    expect(schema.collectionName).toBe('components_shared_blocks_call_to_action');
  });
});

describe('buildComponentMap', () => {
  it('keys components by uid', () => {
    const map = buildComponentMap([dish, { ...dish, uid: 'default.topping' }]);
    expect(Object.keys(map).sort()).toEqual(['default.dish', 'default.topping']);
  });

  it('throws on a duplicate uid', () => {
    expect(() => buildComponentMap([dish, dish])).toThrow(/Duplicate/);
  });
});
