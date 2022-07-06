'use strict';

const ts = require('typescript');
const { factory } = require('typescript');

const {
  getAllStrapiSchemas,
  getDefinitionAttributesCount,
  getSchemaExtendsTypeName,
  getSchemaInterfaceName,
  getSchemaModelType,
  getTypeNode,
  toTypeLitteral,
} = require('../../../generators/schemas/utils');

describe('Utils', () => {
  describe('Get All Strapi Schemas', () => {
    test('Get both components and content types', () => {
      const strapi = {
        contentTypes: {
          ctA: {},
          ctB: {},
        },
        components: {
          comp1: {},
          comp2: {},
          comp3: {},
        },
      };

      const schemas = getAllStrapiSchemas(strapi);

      expect(schemas).toMatchObject({ ctA: {}, ctB: {}, comp1: {}, comp2: {}, comp3: {} });
    });

    test('Get only components if there is no content type', () => {
      const strapi = {
        contentTypes: {},

        components: {
          comp1: {},
          comp2: {},
          comp3: {},
        },
      };

      const schemas = getAllStrapiSchemas(strapi);

      expect(schemas).toMatchObject({ comp1: {}, comp2: {}, comp3: {} });
    });

    test('Get only content types if there is no component', () => {
      const strapi = {
        contentTypes: {
          ctA: {},
          ctB: {},
        },

        components: {},
      };

      const schemas = getAllStrapiSchemas(strapi);

      expect(schemas).toMatchObject({ ctA: {}, ctB: {} });
    });
  });

  describe('Get Definition Attributes Count', () => {
    const createMainNode = (members = []) => {
      return factory.createInterfaceDeclaration(
        undefined,
        undefined,
        factory.createIdentifier('Foo'),
        undefined,
        undefined,
        members
      );
    };

    const createPropertyDeclaration = (name, type) => {
      return factory.createPropertyDeclaration(
        undefined,
        undefined,
        factory.createIdentifier(name),
        undefined,
        type
      );
    };

    test('Returns null if there are no members in the parent node', () => {
      const mainNode = createMainNode();

      const count = getDefinitionAttributesCount(mainNode);

      expect(count).toBeNull();
    });

    test('Returns null if there are members in the parent node, but none named "attributes"', () => {
      const mainNode = createMainNode([
        createPropertyDeclaration(
          'bar',
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        ),
        createPropertyDeclaration(
          'foobar',
          factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
        ),
      ]);

      const count = getDefinitionAttributesCount(mainNode);

      expect(count).toBeNull();
    });

    test('Returns the number of attributes if the property is present', () => {
      const mainNode = createMainNode([
        createPropertyDeclaration(
          'bar',
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        ),
        createPropertyDeclaration(
          'attributes',
          factory.createTypeLiteralNode([
            createPropertyDeclaration(
              'a',
              factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
            ),
            createPropertyDeclaration(
              'b',
              factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
            ),
            createPropertyDeclaration(
              'c',
              factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
            ),
          ])
        ),
        createPropertyDeclaration(
          'foobar',
          factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
        ),
      ]);

      const count = getDefinitionAttributesCount(mainNode);

      expect(count).toBe(3);
    });

    test("Returns 0 if the attributes node is present but don't have any members", () => {
      const mainNode = createMainNode([
        createPropertyDeclaration('attributes', factory.createTypeLiteralNode()),
        createPropertyDeclaration(
          'foobar',
          factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
        ),
      ]);

      const count = getDefinitionAttributesCount(mainNode);

      expect(count).toBe(0);
    });
  });

  describe('Get Schema Model Type', () => {
    test.each([
      [{ modelType: 'component', kind: null }, 'component'],
      [{ modelType: 'contentType', kind: 'singleType' }, 'singleType'],
      [{ modelType: 'contentType', kind: 'collectionType' }, 'collectionType'],
      [{ modelType: 'invalidType', kind: 'foo' }, null],
    ])('%p to be evaluated to %p', (schema, expected) => {
      expect(getSchemaModelType(schema)).toBe(expected);
    });
  });

  describe('Get Schema Extends Type Name', () => {
    test.each([
      [{ modelType: 'component', kind: null }, 'ComponentSchema'],
      [{ modelType: 'contentType', kind: 'singleType' }, 'SingleTypeSchema'],
      [{ modelType: 'contentType', kind: 'collectionType' }, 'CollectionTypeSchema'],
      [{ modelType: 'invalidType', kind: 'foo' }, 'Schema'],
    ])("Expect %p to generate %p as the base type for a schema's interface", (schema, expected) => {
      expect(getSchemaExtendsTypeName(schema)).toBe(expected);
    });
  });

  describe('Get Schema Interface Name', () => {
    test.each([
      ['api::foo.foo', 'ApiFooFoo'],
      ['plugin::bar.foo', 'PluginBarFoo'],
      ['default.dish', 'DefaultDish'],
    ])('Should transform UID (%p) to interface name (%p)', (uid, interfaceName) => {
      expect(getSchemaInterfaceName(uid)).toBe(interfaceName);
    });
  });

  describe('Get Type Node', () => {
    test('Create a valid type reference node based on the given generic parameters', () => {
      const node = getTypeNode('FooBar', [
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
      ]);

      expect(node.typeArguments).toHaveLength(2);

      expect(node.typeArguments[0].kind).toBe(ts.SyntaxKind.StringKeyword);
      expect(node.typeArguments[1].kind).toBe(ts.SyntaxKind.NumberKeyword);
    });

    test('Create a valid empty type reference node', () => {
      const node = getTypeNode('FooBar');

      expect(node.typeArguments).toBeUndefined();
    });
  });

  describe('To Type Litteral', () => {
    test('String', () => {
      const node = toTypeLitteral('foo');

      expect(node.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.text).toBe('foo');
    });

    test('Number', () => {
      const node = toTypeLitteral(42);

      expect(node.kind).toBe(ts.SyntaxKind.FirstLiteralToken);
      expect(node.text).toBe('42');
    });

    test('Boolean', () => {
      const trueNode = toTypeLitteral(true);
      const falseNode = toTypeLitteral(false);

      expect(trueNode.kind).toBe(ts.SyntaxKind.TrueKeyword);
      expect(falseNode.kind).toBe(ts.SyntaxKind.FalseKeyword);
    });

    test('undefined', () => {
      const node = toTypeLitteral(undefined);

      expect(node.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(node.literal).toBe(ts.SyntaxKind.UndefinedKeyword);
    });

    test('null', () => {
      const node = toTypeLitteral(null);

      expect(node.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(node.literal).toBe(ts.SyntaxKind.NullKeyword);
    });

    test('Array (empty)', () => {
      const node = toTypeLitteral([]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(0);
    });

    test('Array (with elements)', () => {
      const node = toTypeLitteral(['foo', 2]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(2);

      expect(node.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.elements[0].text).toBe('foo');

      expect(node.elements[1].kind).toBe(ts.SyntaxKind.FirstLiteralToken);
      expect(node.elements[1].text).toBe('2');
    });

    test('Array (nested)', () => {
      const node = toTypeLitteral(['foo', ['bar', 'foobar']]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(2);

      expect(node.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.elements[0].text).toBe('foo');

      expect(node.elements[1].kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements[1].elements).toHaveLength(2);

      expect(node.elements[1].elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.elements[1].elements[0].text).toBe('bar');

      expect(node.elements[1].elements[1].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.elements[1].elements[1].text).toBe('foobar');
    });

    test('Array (with object)', () => {
      const node = toTypeLitteral([{ foo: 'bar', bar: true }]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(1);

      const objectNode = node.elements[0];

      expect(objectNode.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(objectNode.members).toHaveLength(2);

      expect(objectNode.members[0].kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(objectNode.members[0].name.escapedText).toBe('foo');
      expect(objectNode.members[0].type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(objectNode.members[0].type.text).toBe('bar');

      expect(objectNode.members[1].kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(objectNode.members[1].name.escapedText).toBe('bar');
      expect(objectNode.members[1].type.kind).toBe(ts.SyntaxKind.TrueKeyword);
    });

    test('Object', () => {
      const node = toTypeLitteral({ foo: ['bar', true, 2], bar: null });

      expect(node.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(node.members).toHaveLength(2);

      const [firstMember, secondMember] = node.members;

      expect(firstMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(firstMember.name.escapedText).toBe('foo');
      expect(firstMember.type.kind).toBe(ts.SyntaxKind.TupleType);
      expect(firstMember.type.elements).toHaveLength(3);
      expect(firstMember.type.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(firstMember.type.elements[1].kind).toBe(ts.SyntaxKind.TrueKeyword);
      expect(firstMember.type.elements[2].kind).toBe(ts.SyntaxKind.FirstLiteralToken);

      expect(secondMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(secondMember.name.escapedText).toBe('bar');
      expect(secondMember.type.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(secondMember.type.literal).toBe(ts.SyntaxKind.NullKeyword);
    });

    test('Object with complex keys', () => {
      const node = toTypeLitteral({ 'foo-bar': 'foobar', foo: 'bar' });

      expect(node.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(node.members).toHaveLength(2);

      const [firstMember, secondMember] = node.members;

      expect(firstMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(firstMember.name.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(firstMember.name.text).toBe('foo-bar');
      expect(firstMember.type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(firstMember.type.text).toBe('foobar');

      expect(secondMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(secondMember.name.kind).toBe(ts.SyntaxKind.Identifier);
      expect(secondMember.name.escapedText).toBe('foo');
      expect(secondMember.type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(secondMember.type.text).toBe('bar');
    });

    test('Invalid data type supplied (function)', () => {
      expect(() => toTypeLitteral(() => {})).toThrowError(
        'Cannot convert to object litteral. Unknown type "function"'
      );
    });
  });
});
