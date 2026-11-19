const isStringLiteral = (node) => node?.type === 'Literal' && typeof node.value === 'string';

const isRequireCall = (node) =>
  node?.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  node.callee.name === 'require' &&
  node.arguments.length === 1;

const isRequireLodash = (node) =>
  isRequireCall(node) && isStringLiteral(node.arguments[0]) && node.arguments[0].value === 'lodash';

const getPropertyName = (node) => {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.computed && isStringLiteral(node.property)) return node.property.value;
  return undefined;
};

export default {
  meta: { name: 'strapi' },
  rules: {
    'no-lodash-fp-calls': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          restricted: 'Use regular lodash methods or a focused helper instead of lodash/fp.',
        },
      },
      create(context) {
        const checkSource = (source) => {
          if (
            isStringLiteral(source) &&
            (source.value === 'lodash/fp' ||
              source.value === 'lodash/fp.js' ||
              source.value.startsWith('lodash/fp/'))
          ) {
            context.report({ node: source, messageId: 'restricted' });
          }
        };

        return {
          CallExpression(node) {
            if (isRequireCall(node)) {
              checkSource(node.arguments[0]);
            }
          },
          ImportExpression(node) {
            checkSource(node.source);
          },
        };
      },
    },

    // The native no-restricted-imports rule only sees import specifiers, so it
    // misses `_.map(...)` on a default/namespace/require binding and `require()`.
    'no-restricted-lodash-calls': {
      meta: {
        type: 'problem',
        schema: [
          {
            type: 'object',
            properties: {
              names: { type: 'array', items: { type: 'string' } },
              message: { type: 'string' },
            },
            required: ['names', 'message'],
            additionalProperties: false,
          },
        ],
        messages: {
          restricted: 'Lodash `{{name}}` is restricted. {{message}}',
        },
      },
      create(context) {
        const { names, message } = context.options[0];
        const restricted = new Set(names);
        // Local names bound to the whole lodash module, e.g. `_`.
        const lodashBindings = new Set();
        // Bindings can be declared after use (e.g. a require inside a function).
        const memberAccesses = [];

        const report = (node, name) =>
          context.report({ node, messageId: 'restricted', data: { name, message } });

        const checkPath = (source) => {
          if (!isStringLiteral(source) || !source.value.startsWith('lodash/')) return;
          const name = source.value.slice('lodash/'.length).replace(/\.js$/, '');
          if (restricted.has(name)) report(source, name);
        };

        return {
          ImportDeclaration(node) {
            if (node.source.value !== 'lodash') return;
            node.specifiers
              .filter(
                (specifier) =>
                  specifier.type === 'ImportDefaultSpecifier' ||
                  specifier.type === 'ImportNamespaceSpecifier'
              )
              .forEach((specifier) => lodashBindings.add(specifier.local.name));
          },
          VariableDeclarator(node) {
            if (!isRequireLodash(node.init)) return;
            if (node.id.type === 'Identifier') {
              lodashBindings.add(node.id.name);
              return;
            }
            if (node.id.type !== 'ObjectPattern') return;
            node.id.properties
              .filter(
                (property) =>
                  property.type === 'Property' &&
                  !property.computed &&
                  property.key.type === 'Identifier' &&
                  restricted.has(property.key.name)
              )
              .forEach((property) => report(property, property.key.name));
          },
          MemberExpression(node) {
            const name = getPropertyName(node);
            if (!restricted.has(name)) return;
            if (isRequireLodash(node.object)) {
              report(node, name);
            } else if (node.object.type === 'Identifier') {
              memberAccesses.push({ node, object: node.object.name, name });
            }
          },
          CallExpression(node) {
            if (isRequireCall(node)) checkPath(node.arguments[0]);
          },
          ImportExpression(node) {
            checkPath(node.source);
          },
          'Program:exit'() {
            memberAccesses
              .filter((access) => lodashBindings.has(access.object))
              .forEach((access) => report(access.node, access.name));
          },
        };
      },
    },
  },
};
