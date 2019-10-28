'use strict';

const _ = require('lodash');
const { getComponentAttributes } = require('./utils/attributes');
const { findModelByAssoc, isPolymorphic } = require('./utils/associations');

/**
 * Create utilities to populate a model on fetch
 */

const populateFetch = (definition, options) => {
  // do not populate anything
  if (options.withRelated === false) return;
  if (options.isEager === true) return;

  if (_.isNil(options.withRelated)) {
    options.withRelated = []
      .concat(createComponentsPopulate(definition))
      .concat(createAssociationPopulate(definition));
  } else if (_.isEmpty(options.withRelated)) {
    options.withRelated = createComponentsPopulate(definition);
  } else {
    options.withRelated = formatPopulateOptions(
      definition,
      options.withRelated
    );
  }
};

const isComponent = (def, key) =>
  _.get(def, ['attributes', key, 'type']) === 'component';

const createAssociationPopulate = definition => {
  return definition.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(assoc => {
      if (isPolymorphic({ assoc })) {
        return formatPolymorphicPopulate({
          assoc,
          path: assoc.alias,
        });
      }

      let path = assoc.alias;
      let extraAssocs = [];
      if (assoc) {
        const assocModel = findModelByAssoc({ assoc });

        extraAssocs = assocModel.associations
          .filter(assoc => isPolymorphic({ assoc }))
          .map(assoc =>
            formatPolymorphicPopulate({
              assoc,
              path: assoc.alias,
              prefix: `${path}.`,
            })
          );
      }

      return [assoc.alias, ...extraAssocs];
    })
    .reduce((acc, val) => acc.concat(val), []);
};

const formatPopulateOptions = (definition, withRelated) => {
  if (!Array.isArray(withRelated)) withRelated = [withRelated];

  const obj = withRelated.reduce((acc, key) => {
    if (_.isString(key)) {
      acc[key] = () => {};
      return acc;
    }

    return _.extend(acc, key);
  }, {});

  // if components are no
  const finalObj = Object.keys(obj).reduce((acc, key) => {
    // check the key path and update it if necessary nothing more
    const parts = key.split('.');

    let newKey;
    let prefix = '';
    let tmpModel = definition;
    for (let part of parts) {
      if (isComponent(tmpModel, part)) {
        tmpModel = strapi.components[tmpModel.attributes[part].component];
        // add component path and there relations / images
        const path = `${prefix}${part}.component`;

        newKey = path;
        prefix = `${path}.`;
        continue;
      }

      const assoc = tmpModel.associations.find(
        association => association.alias === part
      );

      if (!assoc) return acc;

      tmpModel = findModelByAssoc({ assoc });

      if (isPolymorphic({ assoc })) {
        const path = formatPolymorphicPopulate({
          assoc,
          path: assoc.alias,
          prefix,
        });

        return _.extend(acc, path);
      }

      newKey = `${prefix}${part}`;
      prefix = `${newKey}.`;
    }

    acc[newKey] = obj[key];
    return acc;
  }, {});

  return [finalObj];
};

const populateComponent = (key, attr) => {
  if (attr.type === 'dynamiczone') return [`${key}.component`];

  let paths = [];
  const component = strapi.components[attr.component];

  const assocs = (component.associations || []).filter(
    assoc => assoc.autoPopulate === true
  );

  // paths.push(`${key}.component`);
  assocs.forEach(assoc => {
    if (isPolymorphic({ assoc })) {
      const rel = formatPolymorphicPopulate({
        assoc,
        path: assoc.alias,
        prefix: `${key}.component.`,
      });

      paths.push(rel);
    } else {
      paths.push(`${key}.component.${assoc.alias}`);
    }
  });

  return [`${key}.component`, ...paths];
};

const createComponentsPopulate = definition => {
  return getComponentAttributes(definition).reduce((acc, key) => {
    const attribute = definition.attributes[key];
    const autoPopulate = _.get(attribute, ['autoPopulate'], true);

    if (autoPopulate === true) {
      return acc.concat(populateComponent(key, attribute));
    }
    return acc;
  }, []);
};

const formatPolymorphicPopulate = ({ assoc, path, prefix = '' }) => {
  if (_.isString(path) && path === assoc.via) {
    return { [`related.${assoc.via}`]: () => {} };
  } else if (_.isString(path) && path === assoc.alias) {
    // MorphTo side.
    if (assoc.related) {
      return { [`${prefix}${assoc.alias}.related`]: () => {} };
    }

    // oneToMorph or manyToMorph side.
    // Retrieve collection name because we are using it to build our hidden model.
    const model = findModelByAssoc({ assoc });

    return {
      [`${prefix}${assoc.alias}.${model.collectionName}`]: function(query) {
        query.orderBy('created_at', 'desc');
      },
    };
  }
};

module.exports = populateFetch;
