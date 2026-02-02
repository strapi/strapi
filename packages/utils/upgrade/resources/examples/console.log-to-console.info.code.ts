import type { Transform } from 'jscodeshift';

/**
 * Note: This codemod is only for development purposes and should be deleted before releasing
 */

const transform: Transform = (file, api) => {
  // Extract the jscodeshift API
  const { j } = api;
  // Parse the file content
  const root = j.withParser('tsx')(file.source);

  root
    // Find console.log calls expressions
    .find(j.CallExpression, {
      callee: { object: { name: 'console' }, property: { name: 'log' } },
    })
    // For each call expression
    .forEach((path) => {
      const { callee } = path.node;

      if (
        // Make sure the callee is a member expression (object/property)
        j.MemberExpression.check(callee) &&
        // Make sure the property is an actual identifier (contains a name property)
        j.Identifier.check(callee.property)
      ) {
        // Update the property's identifier name
        callee.property.name = 'info';
      }
    });

  // Return the updated file content
  return root.toSource();
};

export default transform;
