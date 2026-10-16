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
            source?.type === 'Literal' &&
            typeof source.value === 'string' &&
            (source.value === 'lodash/fp' ||
              source.value === 'lodash/fp.js' ||
              source.value.startsWith('lodash/fp/'))
          ) {
            context.report({ node: source, messageId: 'restricted' });
          }
        };

        return {
          CallExpression(node) {
            if (
              node.callee.type === 'Identifier' &&
              node.callee.name === 'require' &&
              node.arguments.length === 1
            ) {
              checkSource(node.arguments[0]);
            }
          },
          ImportExpression(node) {
            checkSource(node.source);
          },
        };
      },
    },
  },
};
