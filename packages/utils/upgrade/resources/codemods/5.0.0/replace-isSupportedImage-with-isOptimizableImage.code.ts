import type { Transform } from 'jscodeshift';

/**
 * Replaces calls to isSupportedImage with isOptimizableImage
 */

const transform: Transform = (file, api) => {
  // Extract the jscodeshift API
  const { j } = api;
  // Parse the file content
  const root = j(file.source);

  root
    // Find isSupportedImage calls expressions
    .find(j.CallExpression, {
      callee: {
        name: 'isSupportedImage',
      },
    })
    // For each call expression
    .forEach((path) => {
      // Update the callee's name to isOptimizableImage
      path.node.callee.name = 'isOptimizableImage';
    });

  // Return the updated file content
  return root.toSource();
};

export default transform;
