import type { StringLiteral, Transform } from 'jscodeshift';

const transform: Transform = (file, api) => {
  const { j } = api;

  // Parse the file content
  const root = j(file.source);

  if (!file.path.includes('config/database.js')) {
    return file.source;
  }
  const targetProperties = new Set([
    'sqlite3',
    'vscode/sqlite3',
    'sqlite-legacy',
    'better-sqlite3',
  ]);

  return root
    .find(j.ObjectExpression)
    .forEach((path) => {
      j(path)
        .find(j.Property)
        .forEach((propertyPath) => {
          // Check if the property name is one of the targets
          const key = propertyPath.node.key;
          const propertyName = key.type === 'Identifier' ? key.name : (key as StringLiteral).value;

          if (targetProperties.has(propertyName)) {
            // Rename the property to 'sqlite'
            if (key.type === 'Identifier') {
              key.name = 'sqlite';
            } else {
              // For Literal types
              (key as StringLiteral).value = 'sqlite';
            }
          }
        });
    })
    .toSource({ quote: 'single' });
};

export default transform;
