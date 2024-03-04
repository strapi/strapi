import { Transform } from 'jscodeshift';

/**
 * Replaces string dot format for config get/set/has with uid format for 'plugin' namespace
 * For example, `strapi.config.get('plugin.anyString')` will become `strapi.config.get('plugin::anyString')`
 * Also replaces 'api.' with 'api::' except when it's followed by 'rest' or 'responses' (the valid api config values in Strapi v4)
 */
const transform: Transform = (file, api) => {
  const jscodeshift = api.jscodeshift;
  const root = jscodeshift(file.source);

  const ignoreList = ['api.rest', 'api.responses'];

  ['get', 'has', 'set'].forEach((configMethod) => {
    root
      .find(jscodeshift.CallExpression, {
        callee: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: configMethod },
        },
        arguments: [
          {
            type: 'Literal',
            value: (literalValue: unknown) =>
              typeof literalValue === 'string' &&
              (literalValue.startsWith('plugin.') || literalValue.startsWith('api.')),
          },
        ],
      })
      .forEach((path) => {
        const argumentNode = path.node.arguments[0];
        if (
          argumentNode &&
          argumentNode.type === 'Literal' &&
          typeof argumentNode.value === 'string'
        ) {
          if (
            ignoreList.some((ignoreItem) => (argumentNode.value as string).startsWith(ignoreItem))
          ) {
            return;
          }
          argumentNode.value = argumentNode.value.replace('.', '::');
        }
      });
  });

  return root.toSource();
};

export default transform;
