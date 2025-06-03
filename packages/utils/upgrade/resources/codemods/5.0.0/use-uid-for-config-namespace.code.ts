import { Transform } from 'jscodeshift';

/**
 * Replaces string dot format for config get/set/has with uid format for 'plugin' and 'api' namespace where possible
 * For example, `strapi.config.get('plugin.anyString')` will become `strapi.config.get('plugin::anyString')`
 * Ignores api followed by 'rest' or 'responses' because those are the valid Strapi api config values in v4
 */
const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const root = j.withParser('tsx')(file.source);

  const ignoreList = ['api.rest', 'api.responses'];

  ['get', 'has', 'set'].forEach((configMethod) => {
    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'strapi' },
            property: { type: 'Identifier', name: 'config' },
          },
          property: { type: 'Identifier', name: configMethod },
        },
        // Note: we can't filter by arguments because it won't find them in typescript files
      })
      .forEach((path) => {
        const argumentNode = path.node.arguments[0];
        if (j.StringLiteral.check(argumentNode)) {
          const value = argumentNode.value;
          const isTargeted = value.startsWith('plugin.') || value.startsWith('api.');
          const isIgnored = ignoreList.some((ignoreItem) => value.startsWith(ignoreItem));
          if (!isTargeted || isIgnored) {
            return;
          }
          argumentNode.value = value.replace('.', '::');
        }
      });
  });

  return root.toSource();
};

export default transform;
