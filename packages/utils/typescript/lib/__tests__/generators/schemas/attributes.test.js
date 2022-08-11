'use strict';

jest.mock('../../../generators/schemas/imports', () => ({ addImport: jest.fn() }));

const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

const ts = require('typescript');

const attributeToPropertySignature = require('../../../generators/schemas/attributes');
const {
  getAttributeType,
  getAttributeModifiers,
} = require('../../../generators/schemas/attributes');
const { addImport } = require('../../../generators/schemas/imports');

// TODO: emit definition (to a string) & also check snapshots based on that. It would allow checking both the structure & the output.
describe('Attributes', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Attribute to Property Signature', () => {
    const schema = { uid: 'api::foo.foo' };
    const attributeName = 'foo';

    const toPropertySignature = (attribute) => {
      return attributeToPropertySignature(schema, attributeName, attribute);
    };

    const defaultAssertion = (node) => {
      expect(node.kind).toBe(ts.SyntaxKind.PropertySignature);
      expect(node.name.escapedText).toBe(attributeName);
      expect(node.type.kind).toBe(ts.SyntaxKind.IntersectionType);
    };

    test('Invalid attribute type', () => {
      const attribute = { type: 'invalid' };
      const prop = toPropertySignature(attribute);

      expect(prop).toBeNull();
    });

    test('Attribute without type argument', () => {
      const attribute = { type: 'string' };
      const prop = toPropertySignature(attribute);

      defaultAssertion(prop);

      expect(prop.type.types).toHaveLength(1);
      expect(prop.type.types[0].kind).toBe(ts.SyntaxKind.TypeReference);
      expect(prop.type.types[0].typeName.escapedText).toBe('StringAttribute');
      expect(prop.type.types[0].typeArguments).toBeUndefined();
    });

    test('Attribute with type argument', () => {
      const attribute = { type: 'component', component: 'default.comp' };
      const prop = toPropertySignature(attribute);

      defaultAssertion(prop);

      expect(prop.type.types).toHaveLength(1);
      expect(prop.type.types[0].kind).toBe(ts.SyntaxKind.TypeReference);
      expect(prop.type.types[0].typeName.escapedText).toBe('ComponentAttribute');
      expect(prop.type.types[0].typeArguments).toHaveLength(1);
      expect(prop.type.types[0].typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(prop.type.types[0].typeArguments[0].text).toBe('default.comp');
    });

    test('Attribute with type argument and options', () => {
      const attribute = {
        type: 'enumeration',
        enum: ['a', 'b'],
        default: 'b',
        configurable: false,
      };
      const prop = toPropertySignature(attribute);

      defaultAssertion(prop);

      expect(prop.type.types).toHaveLength(2);

      const [attributeType, requiredOptionType] = prop.type.types;

      expect(attributeType.kind).toBe(ts.SyntaxKind.TypeReference);
      expect(attributeType.typeName.escapedText).toBe('EnumerationAttribute');
      expect(attributeType.typeArguments).toHaveLength(1);
      expect(attributeType.typeArguments[0].kind).toBe(ts.SyntaxKind.TupleType);
      expect(attributeType.typeArguments[0].elements[0].text).toBe('a');
      expect(attributeType.typeArguments[0].elements[1].text).toBe('b');

      expect(requiredOptionType.kind).toBe(ts.SyntaxKind.TypeReference);
      expect(requiredOptionType.typeName.escapedText).toBe('DefaultTo');
      expect(requiredOptionType.typeArguments).toHaveLength(1);
      expect(requiredOptionType.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
      expect(requiredOptionType.typeArguments[0].text).toBe('b');
    });
  });

  describe('Get Attribute Type / Mappers', () => {
    test('If the attribute type is not valid then log an error and exit early without importing the type', () => {
      const typeNode = getAttributeType('foo', { type: 'invalid', uid: 'api::foo.foo' });

      expect(typeNode).toBeNull();
      expect(consoleWarnMock).toHaveBeenCalledWith(
        '"foo" attribute from "undefined" has an invalid type: "invalid"'
      );
      expect(addImport).not.toHaveBeenCalled();
    });

    test.each([
      ['string', 'StringAttribute'],
      ['text', 'TextAttribute'],
      ['richtext', 'RichTextAttribute'],
      ['password', 'PasswordAttribute'],
      ['email', 'EmailAttribute'],
      ['date', 'DateAttribute'],
      ['time', 'TimeAttribute'],
      ['datetime', 'DateTimeAttribute'],
      ['timestamp', 'TimestampAttribute'],
      ['integer', 'IntegerAttribute'],
      ['biginteger', 'BigIntegerAttribute'],
      ['float', 'FloatAttribute'],
      ['decimal', 'DecimalAttribute'],
      ['boolean', 'BooleanAttribute'],
      ['json', 'JSONAttribute'],
      ['media', 'MediaAttribute'],
    ])('Basic %p attribute should map to a %p type', (type, expectedType) => {
      const typeNode = getAttributeType('foo', { type });

      expect(ts.isTypeNode(typeNode)).toBeTruthy();

      expect(typeNode.kind).toBe(ts.SyntaxKind.TypeReference);
      expect(typeNode.typeName.escapedText).toBe(expectedType);
      expect(typeNode.typeArguments).toBeUndefined();

      expect(consoleWarnMock).not.toHaveBeenCalled();
      expect(addImport).toHaveBeenCalledWith(expectedType);
    });

    describe('Complex types (with generic type parameters)', () => {
      const defaultAssertions = (typeNode, typeName) => {
        expect(ts.isTypeNode(typeNode)).toBeTruthy();

        expect(typeNode.kind).toBe(ts.SyntaxKind.TypeReference);
        expect(typeNode.typeName.escapedText).toBe(typeName);

        expect(consoleWarnMock).not.toHaveBeenCalled();
        expect(addImport).toHaveBeenCalledWith(typeName);
      };

      describe('Enumeration', () => {
        test('Enumeration with an enum property', () => {
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

      describe('UID', () => {
        test('UID with no options and no target field', () => {
          const attribute = { type: 'uid' };
          const typeNode = getAttributeType('foo', attribute);

          defaultAssertions(typeNode, 'UIDAttribute');

          expect(typeNode.typeArguments).toBeUndefined();
        });

        test('UID with a target field and no options', () => {
          const attribute = { type: 'uid', targetField: 'bar' };
          const typeNode = getAttributeType('foo', attribute, 'api::bar.bar');

          defaultAssertions(typeNode, 'UIDAttribute');

          expect(typeNode.typeArguments).not.toBeUndefined();
          expect(typeNode.typeArguments).toHaveLength(2);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('api::bar.bar');

          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[1].text).toBe('bar');
        });

        test('UID with partial options and no target field', () => {
          const attribute = { type: 'uid', options: { separator: '_' } };
          const typeNode = getAttributeType('foo', attribute);

          defaultAssertions(typeNode, 'UIDAttribute');

          expect(typeNode.typeArguments).toHaveLength(3);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.UndefinedKeyword);
          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.UndefinedKeyword);

          const optionsLiteralNode = typeNode.typeArguments[2];

          expect(optionsLiteralNode.kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(optionsLiteralNode.members).toHaveLength(1);

          expect(optionsLiteralNode.members[0].kind).toBe(ts.SyntaxKind.PropertyDeclaration);

          expect(optionsLiteralNode.members[0].name.kind).toBe(ts.SyntaxKind.Identifier);
          expect(optionsLiteralNode.members[0].name.escapedText).toBe('separator');

          expect(optionsLiteralNode.members[0].type.kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(optionsLiteralNode.members[0].type.text).toBe('_');
        });

        test('UID with options and a target field', () => {
          const attribute = { type: 'uid', options: { separator: '_' }, targetField: 'bar' };
          const typeNode = getAttributeType('foo', attribute, 'api::bar.bar');

          defaultAssertions(typeNode, 'UIDAttribute');

          expect(typeNode.typeArguments).toHaveLength(3);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('api::bar.bar');

          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[1].text).toBe('bar');

          const optionsLiteralNode = typeNode.typeArguments[2];

          expect(optionsLiteralNode.kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(optionsLiteralNode.members).toHaveLength(1);

          expect(optionsLiteralNode.members[0].kind).toBe(ts.SyntaxKind.PropertyDeclaration);

          expect(optionsLiteralNode.members[0].name.kind).toBe(ts.SyntaxKind.Identifier);
          expect(optionsLiteralNode.members[0].name.escapedText).toBe('separator');

          expect(optionsLiteralNode.members[0].type.kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(optionsLiteralNode.members[0].type.text).toBe('_');
        });
      });

      describe('Relation', () => {
        test('Basic relation', () => {
          const attribute = { type: 'relation', relation: 'oneToOne', target: 'api::bar.bar' };
          const typeNode = getAttributeType('foo', attribute, 'api::foo.foo');

          defaultAssertions(typeNode, 'RelationAttribute');

          expect(typeNode.typeArguments).toHaveLength(3);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('api::foo.foo');

          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[1].text).toBe('oneToOne');

          expect(typeNode.typeArguments[2].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[2].text).toBe('api::bar.bar');
        });

        test('Polymorphic relation', () => {
          const attribute = { type: 'relation', relation: 'morphMany' };
          const typeNode = getAttributeType('foo', attribute, 'api::foo.foo');

          defaultAssertions(typeNode, 'RelationAttribute');

          expect(typeNode.typeArguments).toHaveLength(2);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('api::foo.foo');

          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[1].text).toBe('morphMany');
        });
      });

      describe('Component', () => {
        test('Repeatable component', () => {
          const attribute = { type: 'component', component: 'default.comp', repeatable: true };
          const typeNode = getAttributeType('foo', attribute);

          defaultAssertions(typeNode, 'ComponentAttribute');

          expect(typeNode.typeArguments).toHaveLength(2);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('default.comp');

          expect(typeNode.typeArguments[1].kind).toBe(ts.SyntaxKind.TrueKeyword);
        });

        test('Non repeatable component', () => {
          const attribute = { type: 'component', component: 'default.comp' };
          const typeNode = getAttributeType('foo', attribute);

          defaultAssertions(typeNode, 'ComponentAttribute');

          expect(typeNode.typeArguments).toHaveLength(1);

          expect(typeNode.typeArguments[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeNode.typeArguments[0].text).toBe('default.comp');
        });
      });

      describe('Dynamic Zone', () => {
        test('Dynamic Zone with an array of components (targets)', () => {
          const attribute = { type: 'dynamiczone', components: ['default.comp1', 'default.comp2'] };
          const typeNode = getAttributeType('foo', attribute);

          defaultAssertions(typeNode, 'DynamicZoneAttribute');

          expect(typeNode.typeArguments).toHaveLength(1);

          const [typeArgument] = typeNode.typeArguments;

          expect(typeArgument.kind).toBe(ts.SyntaxKind.TupleType);
          expect(typeArgument.elements).toHaveLength(2);

          expect(typeArgument.elements[0].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeArgument.elements[0].text).toBe('default.comp1');

          expect(typeArgument.elements[1].kind).toBe(ts.SyntaxKind.StringLiteral);
          expect(typeArgument.elements[1].text).toBe('default.comp2');
        });
      });
    });
  });

  describe('Get Attribute Modifiers', () => {
    describe('Units', () => {
      describe('Required', () => {
        test('No required', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Required: false', () => {
          const attribute = { required: false };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Required: true', () => {
          const attribute = { required: true };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);
          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('RequiredAttribute');
        });
      });

      describe('Private', () => {
        test('No private', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Private: false', () => {
          const attribute = { private: false };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Private: true', () => {
          const attribute = { private: true };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);
          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('PrivateAttribute');
        });
      });

      describe('Unique', () => {
        test('No unique', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Unique: false', () => {
          const attribute = { unique: false };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Unique: true', () => {
          const attribute = { unique: true };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);
          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('UniqueAttribute');
        });
      });

      describe('Configurable', () => {
        test('No configurable', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Configurable: false', () => {
          const attribute = { configurable: false };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Configurable: true', () => {
          const attribute = { configurable: true };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);
          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('ConfigurableAttribute');
        });
      });

      describe('Plugin Options', () => {
        test('No plugin options', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Plugin Options: { foo: { enabled: true } }', () => {
          const attribute = { pluginOptions: { foo: { enabled: true } } };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);
          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetPluginOptions');
          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('foo');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.TypeLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.members).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].members[0].type.members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].type.members[0].name.escapedText).toBe(
            'enabled'
          );
          expect(modifiers[0].typeArguments[0].members[0].type.members[0].type.kind).toBe(
            ts.SyntaxKind.TrueKeyword
          );
        });
      });

      describe('Min / Max', () => {
        test('No min or max', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Min: 2, no Max', () => {
          const attribute = { min: 2 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMax');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('min');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('2');
        });

        test('No Min, Max: 3', () => {
          const attribute = { max: 3 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMax');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('max');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('3');
        });

        test('Min: 4, Max: 12', () => {
          const attribute = { min: 4, max: 12 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMax');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(2);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('min');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('4');

          expect(modifiers[0].typeArguments[0].members[1].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[1].name.escapedText).toBe('max');
          expect(modifiers[0].typeArguments[0].members[1].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[1].type.text).toBe('12');
        });
      });

      describe('MinLength / MaxLength', () => {
        test('No minLength or maxLength', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('MinLength: 2, no MaxLength', () => {
          const attribute = { minLength: 2 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMaxLength');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('minLength');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('2');
        });

        test('No MinLength, MaxLength: 3', () => {
          const attribute = { maxLength: 3 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMaxLength');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('maxLength');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('3');
        });

        test('MinLength: 4, MaxLength: 12', () => {
          const attribute = { minLength: 4, maxLength: 12 };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('SetMinMaxLength');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(2);

          // Min
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('minLength');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[0].type.text).toBe('4');

          expect(modifiers[0].typeArguments[0].members[1].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[1].name.escapedText).toBe('maxLength');
          expect(modifiers[0].typeArguments[0].members[1].type.kind).toBe(
            ts.SyntaxKind.NumericLiteral
          );
          expect(modifiers[0].typeArguments[0].members[1].type.text).toBe('12');
        });
      });

      describe('Default', () => {
        test('No default', () => {
          const attribute = {};
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(0);
        });

        test('Default: true', () => {
          const attribute = { default: true };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('DefaultTo');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TrueKeyword);
        });

        test('Default: { enabled: true }', () => {
          const attribute = { default: { enabled: true } };
          const modifiers = getAttributeModifiers(attribute);

          expect(modifiers).toHaveLength(1);

          expect(modifiers[0].kind).toBe(ts.SyntaxKind.TypeReference);
          expect(modifiers[0].typeName.escapedText).toBe('DefaultTo');

          expect(modifiers[0].typeArguments).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].kind).toBe(ts.SyntaxKind.TypeLiteral);
          expect(modifiers[0].typeArguments[0].members).toHaveLength(1);
          expect(modifiers[0].typeArguments[0].members[0].kind).toBe(
            ts.SyntaxKind.PropertyDeclaration
          );
          expect(modifiers[0].typeArguments[0].members[0].name.escapedText).toBe('enabled');
          expect(modifiers[0].typeArguments[0].members[0].type.kind).toBe(
            ts.SyntaxKind.TrueKeyword
          );
        });
      });
    });
  });
});
