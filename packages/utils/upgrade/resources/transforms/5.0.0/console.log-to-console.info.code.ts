import type { Transform } from 'jscodeshift';

/**
 * Note: This codemod is only for development purposes and should be deleted before releasing
 */

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const root = j(file.source);
  const consoleLogCalls = root.find(j.CallExpression, {
    callee: {
      object: {
        name: 'console',
      },
      property: {
        name: 'log',
      },
    },
  });

  consoleLogCalls.forEach((p) => {
    // @ts-expect-error - In the future, we should do assertions on the node to make sure it's an object and has a property
    p.node.callee.property.name = 'info';
  });

  return root.toSource();
};

export default transform;
