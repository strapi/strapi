import type { Transform } from 'jscodeshift';

/**
 * Replaces calls to isSupportedImage with isOptimizableImage
 */

const transform: Transform = (file, api) => {
  // Extract the jscodeshift API
  const { j } = api;
  // Parse the file content
  const root = j(file.source);

  // Find and update the destructuring assignment
  root
    .find(j.VariableDeclarator, {
      init: {
        callee: {
          object: { callee: { property: { name: 'getUploadService' } } },
          arguments: [{ value: 'image-manipulation' }],
        },
      },
    })
    .forEach((path) => {
      if (path.node.id.type === 'ObjectPattern') {
        path.node.id.properties.forEach((property) => {
          if (property.key.type === 'Identifier' && property.key.name === 'isSupportedImage') {
            property.key.name = 'isOptimizableImage';
            if (property.value && property.value.type === 'Identifier') {
              property.value.name = 'isOptimizableImage';
            }
          }
        });
      }
    });

  // Update calls to isSupportedImage
  root.find(j.Identifier, { name: 'isSupportedImage' }).forEach((path) => {
    path.node.name = 'isOptimizableImage';
  });

  // Return the updated file content
  return root.toSource();
};

export default transform;
