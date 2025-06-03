import type { Transform, JSCodeshift, ASTPath, ObjectExpression } from 'jscodeshift';

/*
This codemod transforms entity service calls to match the new document service interface.
It supports all kind of argument parsing, including spread elements & deeply nested objects.

Here is a list of scenarios this was tested against

const uid = "api::xxx.xxx";
const entityId = 1;

Case: basic call

strapi.entityService.findOne(uid, entityId, {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  publicationState: "preview",
});


Case: using a variable declared somewhere else

const objectParam_2 = {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  publicationState: "preview",
};

strapi.entityService.findOne(uid, entityId, objectParam_2);

Case: using a variable declared somewhere else with a spread element

const objectParam_3 = {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  publicationState: "preview",
};

strapi.entityService.findOne(uid, entityId, {
  ...objectParam_3,
});


Case: using a variable declared somewhere else with a spread element and overwritten properties

const objectParam_4_1 = {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  publicationState: "preview",
};

const objectParam_4 = {
  publicationState: "live",
  ...objectParam_4_1,
};

strapi.entityService.findOne(uid, entityId, {
  ...objectParam_4,
});

Case: using a variable declared somewhere else with a spread array element while that need its 1st element to be moved

const objectParam_5 = [
  uid,
  entityId,
  {
    fields: ["id", "name", "description"],
    populate: ["author", "comments"],
    publicationState: "preview",
  },
];

strapi.entityService.findOne(...objectParam_5);

Case: using a variable declared somewhere else with a partial spread array

const objectParam_6 = [
  entityId,
  {
    fields: ["id", "name", "description"],
    populate: ["author", "comments"],
    publicationState: "preview",
  },
];

strapi.entityService.findOne(uid, ...objectParam_6);

Case: using a variable declared somewhere else with a partial & nested spread arrays

const objectParam_7_1 = [
  {
    fields: ["id", "name", "description"],
    populate: ["author", "comments"],
    publicationState: "preview",
  },
];

const objectParam_7 = [entityId, ...objectParam_7_1];

strapi.entityService.findOne(uid, ...objectParam_7);

Case: using a variable declared somewhere else with a partial & nested spread arrays & objects

const objectParam_8_1 = {
  publicationState: "preview",
};

const objectParam_8 = [
  entityId,
  {
    fields: ["id", "name", "description"],
    populate: ["author", "comments"],
    ...objectParam_8_1,
  },
];

strapi.entityService.findOne(uid, ...objectParam_8);


Case: some sort of mix of all the above

const objectParam_9_1 = {
  publicationState: "preview",
};

const objectParam_9 = {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  ...objectParam_9_1,
};

strapi.entityService.findOne(uid, ...[entityId, [objectParam_9]]);

Case:  even more complex

const objectParam_10_1 = {
  publicationState: "preview",
};

const objectParam_10_2 = [uid, ...[12], ...[objectParam_10_1]];
const objectParam_10 = [...objectParam_10_2];

strapi.entityService.findOne(...[...objectParam_10]);

Case: find, create, update, delete with entityId as first argument

strapi.entityService.findMany(uid, {
  fields: ["id", "name", "description"],
  populate: ["author", "comments"],
  publicationState: "preview",
});

strapi.entityService.create(uid, {
  data: {
    name: "John Doe",
    age: 30,
  },
});

strapi.entityService.update(uid, entityId, {
  data: {
    name: "John Doe",
    age: 30,
  },
});

strapi.entityService.delete(uid, entityId);
strapi.entityService.findOne(uid, entityId);

*/

const movedFunctions = ['findOne', 'findMany', 'count', 'create', 'update', 'delete'];

const functionsWithEntityId = ['findOne', 'update', 'delete'];

const transformDeclaration = (path: ASTPath<any>, name: any, j: JSCodeshift) => {
  const declaration = findClosestDeclaration(path, name, j);

  if (!declaration) {
    return;
  }

  transformElement(path, declaration.init, j);
};

const transformElement = (path: ASTPath<any>, element: any, j: JSCodeshift) => {
  switch (true) {
    case j.ObjectExpression.check(element): {
      transformObjectParam(path, element, j);
      break;
    }

    case j.Identifier.check(element): {
      transformDeclaration(path, element.name, j);
      break;
    }

    case j.SpreadElement.check(element): {
      transformElement(path, element.argument, j);
      break;
    }

    case j.ArrayExpression.check(element): {
      element.elements.forEach((element) => {
        transformElement(path, element, j);
      });
      break;
    }
    default: {
      break;
    }
  }
};

const transformObjectParam = (path: ASTPath<any>, expression: ObjectExpression, j: JSCodeshift) => {
  expression.properties.forEach((prop) => {
    switch (true) {
      case j.ObjectProperty.check(prop): {
        if (!j.Identifier.check(prop.key) && !j.Literal.check(prop.key)) {
          return;
        }

        if (j.Identifier.check(prop.key) && prop.key.name !== 'publicationState') {
          return;
        }

        if (j.Literal.check(prop.key) && prop.key.value !== 'publicationState') {
          return;
        }

        if (j.Identifier.check(prop.key) && prop.key.name === 'publicationState') {
          if (!prop.computed && !prop.shorthand) {
            prop.key.name = 'status';
          }

          if (prop.shorthand && !prop.computed) {
            prop.shorthand = false;
            prop.key = j.identifier('status');
            prop.value = j.identifier('publicationState');
          }
        } else if (j.Literal.check(prop.key) && prop.key.value === 'publicationState') {
          prop.key.value = 'status';
        }

        switch (true) {
          case j.Literal.check(prop.value): {
            prop.value = prop.value.value === 'live' ? j.literal('published') : j.literal('draft');

            break;
          }
          case j.Identifier.check(prop.value): {
            const declaration = findClosestDeclaration(path, prop.value.name, j);

            if (!declaration) {
              return;
            }

            if (j.Literal.check(declaration.init)) {
              declaration.init =
                declaration.init.value === 'live' ? j.literal('published') : j.literal('draft');
            }

            break;
          }
          default: {
            break;
          }
        }

        break;
      }
      case j.SpreadElement.check(prop): {
        transformElement(path, prop.argument, j);
        break;
      }
      default: {
        break;
      }
    }
  });
};

const findClosestDeclaration = (path: ASTPath<any>, name: string, j) => {
  // find Identifier declaration
  const scope = path.scope.lookup(name);

  if (!scope) {
    return;
  }

  return j(scope.path)
    .find(j.VariableDeclarator, { id: { type: 'Identifier', name } })
    .nodes()[0];
};

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;

  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'MemberExpression',
          object: {
            type: 'Identifier',
            name: 'strapi',
          },
          property: {
            type: 'Identifier',
            name: 'entityService',
          },
        },
        property: {
          type: 'Identifier',
          name: (name) => movedFunctions.includes(name),
        },
      },
    })
    .replaceWith((path) => {
      if (!j.MemberExpression.check(path.value.callee)) {
        return;
      }

      const args = path.value.arguments;

      if (args.length === 0) {
        // we don't know how to transform this
        return;
      }

      type Args = typeof path.value.arguments;

      function resolveArgs(args: Args): Args {
        return args.flatMap((arg: Args[number]) => {
          switch (true) {
            case j.Identifier.check(arg):
            case j.Literal.check(arg): {
              return arg;
            }
            case j.SpreadElement.check(arg): {
              switch (true) {
                case j.Identifier.check(arg.argument): {
                  const identifier = arg.argument;

                  const declaration = findClosestDeclaration(path, identifier.name, j);

                  if (!declaration) {
                    return arg;
                  }

                  switch (true) {
                    case j.ArrayExpression.check(declaration.init): {
                      return resolveArgs(declaration.init.elements);
                    }
                    default:
                      return arg;
                  }
                }
                case j.ArrayExpression.check(arg.argument): {
                  return resolveArgs(arg.argument.elements as Args);
                }
                default: {
                  return arg;
                }
              }
            }
            default: {
              return arg;
            }
          }
        });
      }

      const resolvedArgs = resolveArgs(args);

      const [docUID, ...rest] = resolvedArgs;

      // function with entityId as first argument
      if (
        j.Identifier.check(path.value.callee.property) &&
        functionsWithEntityId.includes(path.value.callee.property.name)
      ) {
        rest.splice(0, 1);

        // in case no extra params are passed in the function e.g delete(uid, entityId)
        if (rest.length === 0) {
          rest.push(
            j.objectExpression.from({
              properties: [],
            })
          );
        }

        const params = rest[0];

        const placeholder = j.objectProperty(j.identifier('documentId'), j.literal('__TODO__'));

        // add documentId to params with a placeholder
        if (j.ObjectExpression.check(params)) {
          params.properties.unshift(placeholder);
        } else if (j.Identifier.check(params)) {
          const declaration = findClosestDeclaration(path, params.name, j);

          if (!declaration) {
            return;
          }

          if (j.ObjectExpression.check(declaration.init)) {
            declaration.init.properties.unshift(placeholder);
          }
        }
      }

      path.value.arguments.forEach((arg) => {
        transformElement(path, arg, j);
      });

      return j.callExpression(
        j.memberExpression(
          j.callExpression(j.memberExpression(j.identifier('strapi'), j.identifier('documents')), [
            docUID,
          ]),
          path.value.callee.property
        ),
        rest
      );
    });

  return root.toSource();
};

export const parser = 'tsx';

export default transform;
