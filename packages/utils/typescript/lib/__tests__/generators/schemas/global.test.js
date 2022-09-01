'use strict';

jest.mock('../../../generators/schemas/utils', () => ({
  getSchemaInterfaceName: jest.fn(),
}));

const ts = require('typescript');
const { get } = require('lodash/fp');

const { generateGlobalDefinition } = require('../../../generators/schemas/global');
const { getSchemaInterfaceName } = require('../../../generators/schemas/utils');

const getSchemasInterfaceNode = get('body.statements[0].body.statements[0]');

describe('Global', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  const assertGlobalNodeStructure = (node) => {
    // "declare global"
    expect(node.kind).toBe(ts.SyntaxKind.ModuleDeclaration);
    expect(node.modifiers).toHaveLength(1);
    expect(node.modifiers[0].kind).toBe(ts.SyntaxKind.DeclareKeyword);
    expect(node.name.originalKeywordKind).toBe(ts.SyntaxKind.GlobalKeyword);
    expect(node.name.escapedText).toBe('global');

    // "namespace Strapi"
    const [strapiNamespace] = node.body.statements;

    expect(strapiNamespace.kind).toBe(ts.SyntaxKind.ModuleDeclaration);
    expect(strapiNamespace.name.kind).toBe(ts.SyntaxKind.Identifier);
    expect(strapiNamespace.name.escapedText).toBe('Strapi');

    // "interface Schemas"
    const [schemasInterface] = strapiNamespace.body.statements;

    expect(schemasInterface.kind).toBe(ts.SyntaxKind.InterfaceDeclaration);
    expect(schemasInterface.name.escapedText).toBe('Schemas');
  };

  describe('Generate Global Definition', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('With empty definition', () => {
      const definitions = [];

      const globalNode = generateGlobalDefinition(definitions);

      assertGlobalNodeStructure(globalNode);

      expect(getSchemaInterfaceName).not.toHaveBeenCalled();

      const schemasNode = getSchemasInterfaceNode(globalNode);

      expect(schemasNode.members).toHaveLength(0);
    });

    test('With no definition', () => {
      const globalNode = generateGlobalDefinition();

      assertGlobalNodeStructure(globalNode);

      expect(getSchemaInterfaceName).not.toHaveBeenCalled();

      const schemasNode = getSchemasInterfaceNode(globalNode);

      expect(schemasNode.members).toHaveLength(0);
    });

    test('With multiple definitions', () => {
      const definitions = [
        { schema: { uid: 'api::foo.foo' } },
        { schema: { uid: 'api::bar.bar' } },
        { schema: { uid: 'api::foobar.foobar' } },
        { schema: { uid: 'default.barfoo' } },
      ];

      getSchemaInterfaceName.mockReturnValue('Placeholder');

      const globalNode = generateGlobalDefinition(definitions);

      assertGlobalNodeStructure(globalNode);

      const schemasNode = getSchemasInterfaceNode(globalNode);

      expect(schemasNode.members).toHaveLength(definitions.length);

      definitions.forEach(({ schema }, index) => {
        const { uid } = schema;
        const node = schemasNode.members[index];

        expect(node.kind).toBe(ts.SyntaxKind.PropertySignature);

        expect(getSchemaInterfaceName).toHaveBeenCalledWith(uid);

        expect(node.name.kind).toBe(ts.SyntaxKind.StringLiteral);
        expect(node.name.text).toBe(uid);
        expect(node.name.singleQuote).toBeTruthy();

        expect(node.type.kind).toBe(ts.SyntaxKind.TypeReference);
        expect(node.type.typeName.escapedText).toBe('Placeholder');
      });
    });
  });
});
