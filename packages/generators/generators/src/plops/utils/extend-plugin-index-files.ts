import * as jscodeshift from 'jscodeshift';
import camelCase from 'lodash/camelCase';

const j = jscodeshift.withParser('tsx');

type AppendType = 'content-type' | 'index' | 'routes';

interface AppendConfig {
  type: AppendType;
  singularName: string;
}

// Helper to check if a string is a valid JavaScript identifier
const isValidIdentifier = (str: string): boolean => {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
};

// Helper to create the appropriate property based on type
const createProperty = (config: AppendConfig) => {
  const { type, singularName } = config;
  const camelCaseName = camelCase(singularName);
  const varName = type === 'content-type' ? `${camelCaseName}Schema` : camelCaseName;

  // Use string literal for key only if singularName is not a valid identifier
  const keyNode = isValidIdentifier(singularName)
    ? j.identifier(singularName)
    : j.literal(singularName);

  switch (type) {
    case 'content-type':
      return j.objectProperty(
        keyNode,
        j.objectExpression([j.objectProperty(j.identifier('schema'), j.identifier(varName))])
      );
    case 'index':
      return j.objectProperty(keyNode, j.identifier(varName));
    case 'routes':
      return j.spreadElement(j.memberExpression(j.identifier(varName), j.identifier('routes')));
    default:
      throw new Error(`Unknown append type: ${type}`);
  }
};

// Helper to check if property already exists
const hasExistingProperty = (obj: any, config: AppendConfig): boolean => {
  const { type, singularName } = config;
  if (!obj?.properties && !j.ArrayExpression.check(obj)) return false;

  const elements = j.ArrayExpression.check(obj) ? obj.elements : obj.properties;
  if (!elements) return false;

  if (type === 'routes') {
    // Check for spread elements ...camelCaseName.routes
    const camelCaseName = camelCase(singularName);
    return elements.some(
      (element: any) =>
        j.SpreadElement.check(element) &&
        j.MemberExpression.check(element.argument) &&
        j.Identifier.check(element.argument.object) &&
        element.argument.object.name === camelCaseName &&
        j.Identifier.check(element.argument.property) &&
        element.argument.property.name === 'routes'
    );
  }

  // For content-type and index, check for object property (both identifier and literal keys)
  return elements.some(
    (prop: any) =>
      j.ObjectProperty.check(prop) &&
      ((j.Identifier.check(prop.key) && prop.key.name === singularName) ||
        (j.Literal.check(prop.key) && prop.key.value === singularName))
  );
};

// Helper to add property to object if it doesn't exist
const addPropertyToObject = (obj: any, config: AppendConfig) => {
  if (!obj || hasExistingProperty(obj, config)) return;

  if (config.type === 'routes' && j.ArrayExpression.check(obj)) {
    obj.elements.push(createRoutesElement(config));
  } else if (obj.properties?.length >= 0) {
    obj.properties.push(createProperty(config));
  }
};

// Helper to find and add to routes array
const handleRoutesArray = (obj: any, config: AppendConfig) => {
  if (!obj?.properties) return false;

  const routesProp = obj.properties.find(
    (prop: any) =>
      j.ObjectProperty.check(prop) &&
      ((j.Identifier.check(prop.key) && prop.key.name === 'routes') ||
        (j.Literal.check(prop.key) && prop.key.value === 'routes')) &&
      j.ArrayExpression.check(prop.value)
  );

  if (routesProp?.value) {
    const routesArray = routesProp.value;
    if (!hasExistingProperty(routesArray, config)) {
      routesArray.elements = routesArray.elements || [];
      routesArray.elements.push(createRoutesElement(config));
    }
    return true;
  }

  return false;
};

// Helper to create routes array element (always returns SpreadElement for routes)
const createRoutesElement = (config: AppendConfig) => {
  const { singularName } = config;
  const camelCaseName = camelCase(singularName);
  return j.spreadElement(j.memberExpression(j.identifier(camelCaseName), j.identifier('routes')));
};

// Helper to create new export for routes
const createRoutesExport = (config: AppendConfig) => {
  return j.arrowFunctionExpression(
    [],
    j.objectExpression([
      j.objectProperty(j.identifier('type'), j.literal('content-api')),
      j.objectProperty(j.identifier('routes'), j.arrayExpression([createRoutesElement(config)])),
    ])
  );
};

// Unified append function for all types
export const appendToFile = (template: string, config: AppendConfig): string => {
  if (!config?.singularName || !config?.type) {
    throw new Error('Invalid config: singularName and type are required');
  }

  const normalizedTemplate = template?.trim() || '';
  const root = normalizedTemplate ? j(normalizedTemplate) : j(j.program([]));
  const { type, singularName } = config;
  const isEsm = detectModuleFormat(normalizedTemplate) === 'esm';

  const camelCaseName = camelCase(singularName);
  const varName = type === 'content-type' ? `${camelCaseName}Schema` : camelCaseName;
  const source = type === 'content-type' ? `./${singularName}/schema.json` : `./${singularName}`;

  addImportIfMissing(root, varName, source, isEsm);

  if (isEsm) {
    handleEsmExport(root, config, type);
  } else {
    handleCjsExport(root, config, type);
  }

  return root.toSource({ quote: 'single' });
};

// Helper to detect module format
const detectModuleFormat = (template: string): 'esm' | 'cjs' => {
  const hasImport = /^import\s/.test(template) || template.includes('import ');
  const hasExportDefault = template.includes('export default');
  const hasRequire = template.includes('require(');
  const hasModuleExports = template.includes('module.exports');

  if (hasImport || hasExportDefault) return 'esm';
  if (hasRequire || hasModuleExports) return 'cjs';
  return 'esm'; // Default to ESM
};

// Helper to insert statement at appropriate location
const insertStatement = (
  root: jscodeshift.Collection<any>,
  statement: any,
  preferredLocation?: jscodeshift.Collection<any>
) => {
  if (preferredLocation && preferredLocation.length > 0) {
    preferredLocation.at(-1).insertAfter(statement);
  } else {
    const firstStatement = root.find(j.Statement).at(0);
    if (firstStatement.length > 0) {
      firstStatement.insertBefore(statement);
    } else {
      handleEmptyFile(root, statement);
    }
  }
};

// Helper to add import/require if missing
const addImportIfMissing = (
  root: jscodeshift.Collection<any>,
  varName: string,
  source: string,
  isEsm: boolean
) => {
  if (isEsm) {
    if (root.find(j.ImportDeclaration, { source: { value: source } }).length === 0) {
      const importDecl = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier(varName))],
        j.literal(source)
      );
      insertStatement(root, importDecl, root.find(j.ImportDeclaration));
    }
  } else if (
    root.find(j.VariableDeclarator, {
      id: { name: varName },
      init: { type: 'CallExpression', callee: { name: 'require' }, arguments: [{ value: source }] },
    }).length === 0
  ) {
    const requireStmt = j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier(varName),
        j.callExpression(j.identifier('require'), [j.literal(source)])
      ),
    ]);

    const requires = root
      .find(j.VariableDeclaration)
      .filter((path) =>
        path.value.declarations.some(
          (decl: any) => j.CallExpression.check(decl.init) && decl.init.callee?.name === 'require'
        )
      );

    const useStrict = root
      .find(j.ExpressionStatement)
      .filter(
        (path: any) =>
          j.Literal.check(path.value.expression) &&
          /use strict/.test(String(path.value.expression.value))
      );

    insertStatement(root, requireStmt, requires.length > 0 ? requires : useStrict);
  }
};

// Helper to safely handle empty files
const handleEmptyFile = (root: jscodeshift.Collection<any>, firstStatement: any) => {
  try {
    // Check if we have any paths in the collection
    const paths = root.paths();
    if (paths.length === 0) {
      // Completely empty collection - create new program
      const newProgram = j.program([firstStatement]);
      // Replace the entire root with new program
      return root.replaceWith(newProgram);
    }

    // Get the first path (should be the program)
    const rootPath = paths[0];
    if (!rootPath || !rootPath.value) {
      // Invalid root path - create new program
      const newProgram = j.program([firstStatement]);
      return root.replaceWith(newProgram);
    }

    // Check if it's a valid program node
    if (j.Program.check(rootPath.value)) {
      // Ensure body exists and add statement
      if (!rootPath.value.body) {
        rootPath.value.body = [];
      }
      rootPath.value.body.push(firstStatement);
    } else {
      // Not a program node - replace with new program
      const newProgram = j.program([firstStatement]);
      rootPath.replace(newProgram);
    }
  } catch (error: any) {
    // Ultimate fallback - create a minimal working file
    console.warn('Failed to handle empty file, creating new program:', error.message);
    const newProgram = j.program([firstStatement]);
    try {
      root.replaceWith(newProgram);
    } catch (replaceError) {
      // Last resort - throw descriptive error
      throw new Error(
        `Unable to add statement to empty file: ${error.message}. Root collection may be invalid.`
      );
    }
  }
};

// Helper to find the exported object regardless of export pattern
const findExportedObject = (root: jscodeshift.Collection<any>, exportedValue: any): any => {
  // Case 1: Direct object export
  if (j.ObjectExpression.check(exportedValue)) {
    return exportedValue;
  }

  // Case 2: Function that returns an object
  if (
    j.FunctionExpression.check(exportedValue) ||
    j.ArrowFunctionExpression.check(exportedValue) ||
    j.FunctionDeclaration.check(exportedValue)
  ) {
    const body = exportedValue.body;
    // Arrow function with object expression body: () => ({...})
    if (j.ObjectExpression.check(body)) {
      return body;
    }
    // Function with return statement in block
    if (j.BlockStatement.check(body)) {
      for (const stmt of body.body) {
        if (j.ReturnStatement.check(stmt) && j.ObjectExpression.check(stmt.argument)) {
          return stmt.argument;
        }
      }
    }
  }

  // Case 3: Identifier reference to a variable
  if (j.Identifier.check(exportedValue)) {
    const varName = exportedValue.name;

    // Find the variable declaration
    const varDeclaration = root.find(j.VariableDeclarator, {
      id: { name: varName },
    });

    if (varDeclaration.length > 0) {
      const init = varDeclaration.get().value.init;

      // If it's an object, return it
      if (j.ObjectExpression.check(init)) {
        return init;
      }

      // If it's a function, recursively check its return value
      if (j.FunctionExpression.check(init) || j.ArrowFunctionExpression.check(init)) {
        return findExportedObject(root, init);
      }
    }
  }

  return null;
};

// Helper to handle object export (common logic for ESM and CJS)
const handleObjectExport = (
  obj: any,
  config: AppendConfig,
  type: AppendType,
  setExport: (newExport: any) => void
) => {
  if (type === 'routes') {
    if (!handleRoutesArray(obj, config)) {
      setExport(createRoutesExport(config));
    }
  } else {
    addPropertyToObject(obj, config);
  }
};

// Handle ESM export default
const handleEsmExport = (
  root: jscodeshift.Collection<any>,
  config: AppendConfig,
  type: AppendType
) => {
  const exports = root.find(j.ExportDefaultDeclaration);

  if (exports.length === 0) {
    const newExport =
      type === 'routes' ? createRoutesExport(config) : j.objectExpression([createProperty(config)]);
    insertStatement(root, j.exportDefaultDeclaration(newExport), root.find(j.Statement));
  } else {
    exports.forEach((path: any) => {
      const decl = path.value.declaration;

      // Find the actual object being exported
      const exportedObject = findExportedObject(root, decl);

      if (exportedObject) {
        handleObjectExport(exportedObject, config, type, (newExport) => {
          path.value.declaration = newExport;
        });
      } else {
        // Fallback: replace the entire export
        path.value.declaration =
          type === 'routes'
            ? createRoutesExport(config)
            : j.objectExpression([createProperty(config)]);
      }
    });
  }
};

// Handle CJS module.exports
const handleCjsExport = (
  root: jscodeshift.Collection<any>,
  config: AppendConfig,
  type: AppendType
) => {
  const exports = root.find(j.AssignmentExpression, {
    left: { type: 'MemberExpression', object: { name: 'module' }, property: { name: 'exports' } },
  });

  if (exports.length === 0) {
    const newExport =
      type === 'routes' ? createRoutesExport(config) : j.objectExpression([createProperty(config)]);
    const moduleExportStmt = j.expressionStatement(
      j.assignmentExpression(
        '=',
        j.memberExpression(j.identifier('module'), j.identifier('exports')),
        newExport
      )
    );
    insertStatement(root, moduleExportStmt, root.find(j.Statement));
  } else {
    exports.forEach((path: any) => {
      const right = path.value.right;

      // Find the actual object being exported
      const exportedObject = findExportedObject(root, right);

      if (exportedObject) {
        handleObjectExport(exportedObject, config, type, (newExport) => {
          path.value.right = newExport;
        });
      } else {
        // Fallback: replace the entire export
        path.value.right =
          type === 'routes'
            ? createRoutesExport(config)
            : j.objectExpression([createProperty(config)]);
      }
    });
  }
};
