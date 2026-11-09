import * as ts from 'typescript';

import { generateSchemaDefinition } from '../../../generators/common/models/schema';
import { toTypeLiteral } from '../../../generators/common/models/utils';

/**
 * In Danish, `aa` sorts after `z`, so a machine with a Danish locale would order these names
 * `alpha`, `zz`, `aardvark`. In English they are `aardvark`, `alpha`, `zz`.
 */
const NAMES = ['alpha', 'aardvark', 'zz'];
const ENGLISH_ORDER = ['aardvark', 'alpha', 'zz'];

const getMemberNames = (node: ts.TypeLiteralNode) => {
  return node.members.map((member) => (member.name as ts.Identifier).text);
};

describe('Generated order does not depend on the machine locale', () => {
  const { localeCompare } = String.prototype;

  beforeEach(() => {
    // Simulate a machine whose default locale is Danish: a call without an explicit locale
    // collates in Danish.
    jest.spyOn(String.prototype, 'localeCompare').mockImplementation(function localeCompareDanish(
      this: string,
      that: string,
      locales?: string | string[],
      options?: Intl.CollatorOptions
    ) {
      return localeCompare.call(this, that, locales === undefined ? 'da' : locales, options);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Sorts the schema attributes in English order', () => {
    const attributes = Object.fromEntries(NAMES.map((name) => [name, { type: 'string' }]));

    const definition = generateSchemaDefinition({
      uid: 'api::foo.foo',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes,
    } as any);

    const attributesProperty = definition.members.find(
      (member) => (member.name as ts.Identifier).text === 'attributes'
    ) as ts.PropertySignature;

    expect(getMemberNames(attributesProperty.type as ts.TypeLiteralNode)).toStrictEqual(
      ENGLISH_ORDER
    );
  });

  test('Sorts the object literal keys in English order', () => {
    const node = toTypeLiteral(Object.fromEntries(NAMES.map((name) => [name, true])));

    expect(getMemberNames(node as ts.TypeLiteralNode)).toStrictEqual(ENGLISH_ORDER);
  });
});
