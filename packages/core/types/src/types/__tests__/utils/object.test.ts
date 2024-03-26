import path from 'path';
import { t, AssertTypeSelector } from '@strapi/ts-zen';
import type ObjectUtils from '../definitions/utils/object';
import { createTypeSelector } from '../test.utils';

const DEFINITIONS_PATH = path.join('utils', 'object.d.ts');

let type: AssertTypeSelector<typeof ObjectUtils>;

describe('Utils.Object', () => {
  beforeAll(() => {
    type = createTypeSelector(DEFINITIONS_PATH);
  });

  test('KeysBy', () => {
    type('KeysByString').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar')]);
    type('KeysByNumber').isStringLiteral('foobar');
    type('KeysByNever').isNever();
    type('KeysByUnknown').isUnion([
      t.stringLiteral('foo'),
      t.stringLiteral('bar'),
      t.stringLiteral('foobar'),
    ]);
    type('KeysByObj').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar')]);
  });

  test('KeysExcept', () => {
    type('KeysExceptString').isStringLiteral('foobar');
    type('KeysExceptNumber').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar')]);
    type('KeysExceptNever').isUnion([
      t.stringLiteral('foo'),
      t.stringLiteral('bar'),
      t.stringLiteral('foobar'),
    ]);
    type('KeysExceptUnknown').isNever();
    type('KeysExceptObj').isStringLiteral('other');
  });

  test('PickBy', () => {
    type('PickByString').isMappedType({
      properties: {
        // @ts-expect-error - Wants to be string[]
        foo: t.stringLiteral('bar'),
        bar: t.stringLiteral('foo'),
      },
    });
    type('PickByNumber').isMappedType({
      properties: {
        // @ts-expect-error - Wants to be string[]
        foobar: t.numberLiteral(2),
      },
    });
    type('PickByNever').isMappedType({
      // @ts-expect-error - Thinks it _must_ have a property
      properties: {},
    });
    type('PickByUnknown').isMappedType({
      properties: {
        // @ts-expect-error - Wants to be string[]
        foobar: t.numberLiteral(2),
        foo: t.stringLiteral('bar'),
        bar: t.stringLiteral('foo'),
      },
    });
    type('PickByObj').isMappedType({
      properties: {
        // @ts-expect-error - Wants to be string[]
        foo: t.mappedType({ properties: { x: t.stringLiteral('bar') } }),
        // @ts-expect-error - Wants to be string[]
        bar: t.mappedType({ properties: { x: t.stringLiteral('foo') } }),
      },
    });
  });

  test('Values', () => {
    type('Values').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar'), t.numberLiteral(2)]);
    type('ValuesNever').isNever();
    type('ValuesContainNever').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar')]);
  });

  test.skip('Replace', () => {
    // const expectedResultType = t.object({
    //   properties: {
    //     foo: t.numberLiteral(2),
    //     bar: t.stringLiteral('foo'),
    //   },
    // });
    // // TODO: Fix object type check
    // type('Replace').isObject(expectedResultType);
  });
});
