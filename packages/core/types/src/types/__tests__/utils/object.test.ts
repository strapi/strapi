import path from 'path';
import { t, AssertTypeSelector } from 'ts-zen';
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
        foo: t.stringLiteral('bar'),
        bar: t.stringLiteral('foo'),
      },
    });
    type('PickByNumber').isMappedType({
      properties: {
        foobar: t.numberLiteral(2),
      },
    });
    type('PickByNever').isMappedType({
      properties: {},
    });
    type('PickByUnknown').isMappedType({
      properties: {
        foobar: t.numberLiteral(2),
        foo: t.stringLiteral('bar'),
        bar: t.stringLiteral('foo'),
      },
    });
    type('PickByObj').isMappedType({
      properties: {
        foo: t.mappedType({ properties: { x: t.stringLiteral('bar') } }),
        bar: t.mappedType({ properties: { x: t.stringLiteral('foo') } }),
      },
    });
  });

  test('Values', () => {
    type('Values').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar'), t.numberLiteral(2)]);
    type('ValuesNever').isNever();
    type('ValuesContainNever').isUnion([t.stringLiteral('foo'), t.stringLiteral('bar')]);
  });
});
