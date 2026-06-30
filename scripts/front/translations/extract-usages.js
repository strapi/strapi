'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const SOURCE_GLOB = '**/*.{ts,tsx,js,jsx}';
const IGNORE_GLOBS = ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/tests/**'];

const parseFile = (filePath) => {
  const source = fs.readFileSync(filePath, 'utf8');

  return parser.parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    sourceFilename: filePath,
  });
};

const getStaticString = (node) => {
  if (!node) {
    return null;
  }

  if (t.isStringLiteral(node)) {
    return { value: node.value, dynamic: false };
  }

  if (t.isTemplateLiteral(node)) {
    if (node.expressions.length > 0) {
      return { value: null, dynamic: true };
    }

    return { value: node.quasis.map((quasi) => quasi.value.cooked ?? '').join(''), dynamic: false };
  }

  return null;
};

const resolveHelperCall = (node, translationHelpers) => {
  if (!t.isCallExpression(node)) {
    return null;
  }

  if (!t.isIdentifier(node.callee) || !translationHelpers.includes(node.callee.name)) {
    return null;
  }

  const [firstArg] = node.arguments;
  const staticString = getStaticString(firstArg);

  if (!staticString) {
    return null;
  }

  return staticString;
};

const resolveIdNode = (node, translationHelpers) => {
  const staticString = getStaticString(node);

  if (staticString) {
    return staticString;
  }

  return resolveHelperCall(node, translationHelpers);
};

const runtimeIdToEnKey = (runtimeId, prefix) => {
  if (!prefix) {
    return runtimeId;
  }

  if (runtimeId.startsWith(prefix)) {
    return runtimeId.slice(prefix.length);
  }

  return runtimeId;
};

const extractObjectProperties = (node) => {
  const properties = {};

  if (!t.isObjectExpression(node)) {
    return properties;
  }

  node.properties.forEach((property) => {
    if (!t.isObjectProperty(property) || property.computed) {
      return;
    }

    if (!t.isIdentifier(property.key) && !t.isStringLiteral(property.key)) {
      return;
    }

    const key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
    properties[key] = property.value;
  });

  return properties;
};

const extractUsagesFromFile = (filePath, packageConfig) => {
  const usages = [];
  const relativeFilePath = path.relative(process.cwd(), filePath);

  let ast;

  try {
    ast = parseFile(filePath);
  } catch (error) {
    usages.push({
      type: 'parse-error',
      filePath: relativeFilePath,
      message: error.message,
    });

    return usages;
  }

  const recordUsage = ({ enKey, runtimeId, defaultMessage, dynamic, line }) => {
    usages.push({
      type: dynamic ? 'dynamic-id' : 'usage',
      filePath: relativeFilePath,
      line,
      enKey,
      runtimeId,
      defaultMessage,
      dynamic,
    });
  };

  try {
    traverse(
      ast,
      {
        ObjectExpression(objectPath) {
          const properties = extractObjectProperties(objectPath.node);
          const idNode = properties.id;

          if (!idNode) {
            return;
          }

          const resolvedId = resolveIdNode(idNode, packageConfig.translationHelpers);
          const defaultMessageNode = properties.defaultMessage;
          const resolvedDefaultMessage = defaultMessageNode
            ? getStaticString(defaultMessageNode)
            : null;
          const line = objectPath.node.loc?.start.line;

          if (!resolvedId) {
            recordUsage({
              enKey: null,
              runtimeId: null,
              defaultMessage: resolvedDefaultMessage?.dynamic
                ? null
                : resolvedDefaultMessage?.value,
              dynamic: true,
              line,
            });
            return;
          }

          if (resolvedId.dynamic) {
            recordUsage({
              enKey: null,
              runtimeId: null,
              defaultMessage: resolvedDefaultMessage?.dynamic
                ? null
                : resolvedDefaultMessage?.value,
              dynamic: true,
              line,
            });
            return;
          }

          const fromHelper = t.isCallExpression(idNode);
          let runtimeId;
          let enKey;

          if (fromHelper) {
            enKey = resolvedId.value;
            runtimeId = packageConfig.prefix ? `${packageConfig.prefix}${enKey}` : enKey;
          } else {
            runtimeId = resolvedId.value;

            if (!packageConfig.prefix) {
              enKey = runtimeId;
            } else if (runtimeId.startsWith(packageConfig.prefix)) {
              enKey = runtimeId.slice(packageConfig.prefix.length);
            } else {
              usages.push({
                type: 'external-id',
                filePath: relativeFilePath,
                line,
                runtimeId,
                defaultMessage:
                  resolvedDefaultMessage && !resolvedDefaultMessage.dynamic
                    ? resolvedDefaultMessage.value
                    : undefined,
              });
              return;
            }
          }

          recordUsage({
            enKey,
            runtimeId,
            defaultMessage:
              resolvedDefaultMessage && !resolvedDefaultMessage.dynamic
                ? resolvedDefaultMessage.value
                : undefined,
            dynamic: false,
            line,
          });
        },
      },
      { noScope: true }
    );
  } catch (error) {
    usages.push({
      type: 'parse-error',
      filePath: relativeFilePath,
      message: error.message,
    });
  }

  return usages;
};

const extractPackageUsages = (packageConfig) => {
  const files = globSync(path.join(packageConfig.sourceDir, SOURCE_GLOB), {
    nodir: true,
    ignore: IGNORE_GLOBS.map((pattern) => path.join(packageConfig.sourceDir, pattern)),
  });

  return files.flatMap((filePath) => extractUsagesFromFile(filePath, packageConfig));
};

const groupUsagesByKey = (usages) => {
  const grouped = new Map();

  usages.forEach((usage) => {
    if (usage.type !== 'usage' || !usage.enKey) {
      return;
    }

    if (!grouped.has(usage.enKey)) {
      grouped.set(usage.enKey, []);
    }

    grouped.get(usage.enKey).push(usage);
  });

  return grouped;
};

module.exports = {
  extractPackageUsages,
  extractUsagesFromFile,
  groupUsagesByKey,
  runtimeIdToEnKey,
};
