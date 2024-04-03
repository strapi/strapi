import { Transform, JSCodeshift, Collection } from 'jscodeshift';

/*

This codemod transforms @strapi/utils imports to change method calls to match the new public interface.
It will also warn about removed functions to avoid breaking user code.

ESM

Before:

import * as utils from '@strapi/utils';

utils.nameToSlug();

After:

import { strings } from '@strapi/utils';

strings.nameToSlug();

---
ESM

Before:

import { nameToSlug } from '@strapi/utils';

nameToSlug();

After:

import { strings } from '@strapi/utils';

strings.nameToSlug();

---

Common JS

Before:

const utils = require('@strapi/utils');

utils.nameToSlug();

After:

const { strings } = require('@strapi/utils');

strings.nameToSlug();

---
Common JS

Before:

const { nameToSlug } = require('@strapi/utils');

nameToSlug();

After:

const { strings } = require('@strapi/utils');

strings.nameToSlug();

*/

const changes = {
  strings: {
    nameToSlug: 'nameToSlug',
    nameToCollectionName: 'nameToCollectionName',
    stringEquals: 'isEqual',
    isCamelCase: 'isCamelCase',
    isKebabCase: 'isKebabCase',
    toKebabCase: 'toKebabCase',
    toRegressedEnumValue: 'toRegressedEnumValue',
    startsWithANumber: 'startsWithANumber',
    joinBy: 'joinBy',
  },
  arrays: {
    stringIncludes: 'includesString',
  },
  objects: {
    keysDeep: 'keysDeep',
  },
  dates: {
    generateTimestampCode: 'timestampCode',
  },
  async: {
    pipeAsync: 'pipe',
    mapAsync: 'map',
    reduceAsync: 'reduce',
  },
};

const removed = [
  'getCommonBeginning',
  'templateConfiguration',
  'removeUndefined',
  'getConfigUrls',
  'getAbsoluteAdminUrl',
  'getAbsoluteServerUrl',
  'forEachAsync',
];

const transformImports = (root: Collection, j: JSCodeshift) => {
  root
    .find(j.ImportDeclaration, {
      source: { value: '@strapi/utils' },
    })
    .forEach((path) => {
      if (!j.ImportDeclaration.check(path.value)) {
        return;
      }

      path.value.specifiers.forEach((specifier) => {
        if (!j.ImportSpecifier.check(specifier)) {
          return false;
        }

        if (removed.includes(specifier.imported.name)) {
          console.warn(
            `Function "${specifier.imported.name}" was removed. You will have to remove it from your code.`
          );

          return false;
        }
      });

      for (const primitive of Object.keys(changes)) {
        const functions = Object.keys(changes[primitive]);

        const specifiersToRefactor = path.value.specifiers.filter((specifier) => {
          return j.ImportSpecifier.check(specifier) && functions.includes(specifier.imported.name);
        });

        if (specifiersToRefactor.length > 0) {
          path.value.specifiers.unshift(j.importSpecifier(j.identifier(primitive)));

          specifiersToRefactor.forEach((specifier) => {
            const index = path.value.specifiers.indexOf(specifier);
            path.value.specifiers.splice(index, 1);
          });
        }
      }

      if (path.value.specifiers?.length === 0) {
        j(path).remove();
      }
    });

  root.find(j.ImportNamespaceSpecifier).forEach((specifierPath) => {
    if (specifierPath.parent.value.source.value === '@strapi/utils') {
      for (const primitive of Object.keys(changes)) {
        const functions = Object.keys(changes[primitive]);
        functions.forEach((funcName) => {
          root
            .find(j.CallExpression, {
              callee: {
                type: 'MemberExpression',
                property: {
                  type: 'Identifier',
                  name: funcName,
                },
                object: {
                  type: 'Identifier',
                  name: specifierPath.value.local.name,
                },
              },
            })
            .replaceWith((path) => {
              return j.callExpression(
                j.memberExpression(
                  j.memberExpression(
                    j.identifier(specifierPath.value.local.name),
                    j.identifier(primitive)
                  ),
                  j.identifier(changes[primitive][funcName])
                ),
                path.value.arguments
              );
            });
        });
      }
    }
  });

  root
    .find(j.VariableDeclarator, {
      init: {
        callee: {
          name: 'require',
        },
        arguments: [{ value: '@strapi/utils' }],
      },
    })
    .forEach((path) => {
      // destructured require

      if (j.ObjectPattern.check(path.value.id)) {
        const properties = path.value.id.properties;

        properties?.forEach((property) => {
          if (!j.ObjectProperty.check(property) || !j.Identifier.check(property.value)) {
            return false;
          }

          if (removed.includes(property.value.name)) {
            console.warn(
              `Function "${property.value.name}" was removed. You will have to remove it from your code.`
            );

            return false;
          }
        });

        for (const primitive of Object.keys(changes)) {
          const functions = Object.keys(changes[primitive]);

          const propertiesToRefactor = properties?.filter((property) => {
            return (
              j.ObjectProperty.check(property) &&
              j.Identifier.check(property.value) &&
              functions.includes(property.value.name)
            );
          });

          if (propertiesToRefactor?.length > 0) {
            const identifier = j.identifier(primitive);

            properties?.unshift(
              j.objectProperty.from({
                key: identifier,
                value: identifier,
                shorthand: true,
              })
            );

            propertiesToRefactor.forEach((property) => {
              const index = properties?.indexOf(property);
              properties?.splice(index, 1);
            });
          }
        }

        if (path.value.id.properties?.length === 0) {
          j(path).remove();
        }
      }

      // namespace require
      if (path.value.id.type === 'Identifier') {
        const identifier = path.value.id.name;

        for (const primitive of Object.keys(changes)) {
          const functions = Object.keys(changes[primitive]);
          functions.forEach((funcName) => {
            root
              .find(j.CallExpression, {
                callee: {
                  type: 'MemberExpression',
                  property: {
                    type: 'Identifier',
                    name: funcName,
                  },
                  object: {
                    type: 'Identifier',
                    name: identifier,
                  },
                },
              })
              .replaceWith((path) => {
                return j.callExpression(
                  j.memberExpression(
                    j.memberExpression(j.identifier(identifier), j.identifier(primitive)),
                    j.identifier(changes[primitive][funcName])
                  ),
                  path.value.arguments
                );
              });
          });
        }
      }
    });

  for (const primitive of Object.keys(changes)) {
    const functions = Object.keys(changes[primitive]);
    functions.forEach((funcName) => {
      root
        .find(j.CallExpression, {
          callee: {
            type: 'Identifier',
            name: funcName,
          },
        })
        .replaceWith((path) => {
          if (j.Identifier.check(path.value.callee)) {
            path.value.callee.name = changes[primitive][funcName];
            return j.memberExpression(j.identifier(primitive), path.value);
          }
        });
    });
  }
};

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;

  const root = j(file.source);

  transformImports(root, j);

  return root.toSource();
};

export const parser = 'tsx';

export default transform;
