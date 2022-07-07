'use strict';

jest.mock('../../../generators/schemas/imports', () => ({ addImport: jest.fn() }));

const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

const ts = require('typescript');

const { getAttributeType } = require('../../../generators/schemas/attributes');
const { addImport } = require('../../../generators/schemas/imports');

describe('Attributes', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  // TODO
  // describe('Attribute to Property Signature', () => {});

  // TODO
  // describe('Mappers', () => {});

  describe('Get Attribute Type', () => {
    test('If the attribute type is not valid then log an error and exit early without importing the type', () => {
      const typeNode = getAttributeType('foo', { type: 'invalid', uid: 'api::foo.foo' });

      expect(typeNode).toBeNull();
      expect(consoleWarnMock).toHaveBeenCalledWith(
        '"foo" attribute from "undefined" has an invalid type: "invalid"'
      );
      expect(addImport).not.toHaveBeenCalled();
    });

    test('Return a basic type node without generic type parameter', () => {
      const typeNode = getAttributeType('foo', { type: 'string' });

      expect(ts.isTypeNode(typeNode)).toBeTruthy();

      expect(typeNode.kind).toBe(ts.SyntaxKind.TypeReference);
      expect(typeNode.typeName.escapedText).toBe('StringAttribute');
      expect(typeNode.typeArguments).toBeUndefined();

      expect(consoleWarnMock).not.toHaveBeenCalled();
      expect(addImport).toHaveBeenCalledWith('StringAttribute');
    });

    describe('Complex types (with generic type parameters)', () => {
      const defaultAssertions = (typeNode, typeName) => {
        expect(ts.isTypeNode(typeNode)).toBeTruthy();

        expect(typeNode.kind).toBe(ts.SyntaxKind.TypeReference);
        expect(typeNode.typeName.escapedText).toBe(typeName);

        expect(consoleWarnMock).not.toHaveBeenCalled();
        expect(addImport).toHaveBeenCalledWith(typeName);
      };

      test('Enumeration', () => {
        const attribute = { type: 'enumeration', enum: ['a', 'b', 'c'] };
        const typeNode = getAttributeType('foo', attribute);

        defaultAssertions(typeNode, 'EnumerationAttribute');

        expect(typeNode.typeArguments).toHaveLength(1);
        expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.TupleType);

        const tupleElements = typeNode.typeArguments[0].elements;

        attribute.enum.forEach((value, index) => {
          const element = tupleElements[index];

          expect(element.kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(element.text).toBe(value);
        });
      });
    });
  });

  // TODO
  // describe('Get Attribute Modifiers', () => {});
});
