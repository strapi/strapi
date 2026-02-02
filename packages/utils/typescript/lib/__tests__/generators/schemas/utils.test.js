'use strict';

const ts = require('typescript');
const { factory } = require('typescript');

const {
  getDefinitionAttributesCount,
  getSchemaExtendsTypeName,
  getSchemaInterfaceName,
  getSchemaModelType,
  getTypeNode,
  toTypeLiteral,
} = require('../../../generators/common/models/utils');

describe('Utils', () => {
  describe('Get Definition Attributes Count', () => {
    const createMainNode = (members = []) => {
      return factory.createInterfaceDeclaration(
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
      [{ modelType: 'component', kind: null }, 'Struct.ComponentSchema'],
      [{ modelType: 'contentType', kind: 'singleType' }, 'Struct.SingleTypeSchema'],
      [{ modelType: 'contentType', kind: 'collectionType' }, 'Struct.CollectionTypeSchema'],
      [{ modelType: 'invalidType', kind: 'foo' }, null],
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

  describe('To Type Literal', () => {
    test('String', () => {
      const node = toTypeLiteral('foo');

      expect(node.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.text).toBe('foo');
    });

    test('Number', () => {
      const nodePositive = toTypeLiteral(42);
      const nodeNegative = toTypeLiteral(-42);

      expect(nodePositive.kind).toBe(ts.SyntaxKind.FirstLiteralToken);
      expect(nodePositive.text).toBe('42');

      expect(nodeNegative.kind).toBe(ts.SyntaxKind.PrefixUnaryExpression);
      expect(nodeNegative.operator).toBe(ts.SyntaxKind.MinusToken);
      expect(nodeNegative.operand.kind).toBe(ts.SyntaxKind.FirstLiteralToken);
      expect(nodeNegative.operand.text).toBe('42');
    });

    test('Boolean', () => {
      const trueNode = toTypeLiteral(true);
      const falseNode = toTypeLiteral(false);

      expect(trueNode.kind).toBe(ts.SyntaxKind.TrueKeyword);
      expect(falseNode.kind).toBe(ts.SyntaxKind.FalseKeyword);
    });

    test('undefined', () => {
      const node = toTypeLiteral(undefined);

      expect(node.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(node.literal).toBe(ts.SyntaxKind.UndefinedKeyword);
    });

    test('null', () => {
      const node = toTypeLiteral(null);

      expect(node.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(node.literal).toBe(ts.SyntaxKind.NullKeyword);
    });

    test('Array (empty)', () => {
      const node = toTypeLiteral([]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(0);
    });

    test('Array (with elements)', () => {
      const node = toTypeLiteral(['foo', 2]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(2);

      expect(node.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(node.elements[0].text).toBe('foo');

      expect(node.elements[1].kind).toBe(ts.SyntaxKind.FirstLiteralToken);
      expect(node.elements[1].text).toBe('2');
    });

    test('Array (nested)', () => {
      const node = toTypeLiteral(['foo', ['bar', 'foobar']]);

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
      const node = toTypeLiteral([{ foo: 'bar', bar: true }]);

      expect(node.kind).toBe(ts.SyntaxKind.TupleType);
      expect(node.elements).toHaveLength(1);

      const objectNode = node.elements[0];

      expect(objectNode.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(objectNode.members).toHaveLength(2);

      expect(objectNode.members[0].kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(objectNode.members[0].name.escapedText).toBe('bar');
      expect(objectNode.members[0].type.kind).toBe(ts.SyntaxKind.TrueKeyword);

      expect(objectNode.members[1].kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(objectNode.members[1].name.escapedText).toBe('foo');
      expect(objectNode.members[1].type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(objectNode.members[1].type.text).toBe('bar');
    });

    test('Object', () => {
      const node = toTypeLiteral({ foo: ['bar', true, 2], bar: null });

      expect(node.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(node.members).toHaveLength(2);

      const [barMember, fooMember] = node.members;

      expect(barMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(barMember.name.escapedText).toBe('bar');
      expect(barMember.type.kind).toBe(ts.SyntaxKind.LiteralType);
      expect(barMember.type.literal).toBe(ts.SyntaxKind.NullKeyword);

      expect(fooMember.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(fooMember.name.escapedText).toBe('foo');
      expect(fooMember.type.kind).toBe(ts.SyntaxKind.TupleType);
      expect(fooMember.type.elements).toHaveLength(3);
      expect(fooMember.type.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(fooMember.type.elements[1].kind).toBe(ts.SyntaxKind.TrueKeyword);
      expect(fooMember.type.elements[2].kind).toBe(ts.SyntaxKind.FirstLiteralToken);
    });

    test('Object with complex keys', () => {
      const node = toTypeLiteral({ 'foo-bar': 'foobar', foo: 'bar' });

      expect(node.kind).toBe(ts.SyntaxKind.TypeLiteral);
      expect(node.members).toHaveLength(2);

      const [fooBar, fooDashBar] = node.members;

      expect(fooBar.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(fooBar.name.kind).toBe(ts.SyntaxKind.Identifier);
      expect(fooBar.name.escapedText).toBe('foo');
      expect(fooBar.type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(fooBar.type.text).toBe('bar');

      expect(fooDashBar.kind).toBe(ts.SyntaxKind.PropertyDeclaration);
      expect(fooDashBar.name.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(fooDashBar.name.text).toBe('foo-bar');
      expect(fooDashBar.type.kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(fooDashBar.type.text).toBe('foobar');
    });

    test('Invalid data type supplied (function)', () => {
      expect(() => toTypeLiteral(() => {})).toThrowError(
        'Cannot convert to object literal. Unknown type "function"'
      );
    });
  });
});
