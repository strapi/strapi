'use strict';

const _ = require('lodash');
const { getComponentAttributes, isComponent } = require('./utils/attributes');
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
      .concat(populateComponents(definition))
      .concat(populateAssociations(definition));
  } else if (_.isEmpty(options.withRelated)) {
    options.withRelated = populateComponents(definition);
  } else {
    options.withRelated = formatPopulateOptions(
      definition,
      options.withRelated
    );
  }
};

const populateAssociations = (definition, { prefix = '' } = {}) => {
  return definition.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(assoc => {
      if (isPolymorphic({ assoc })) {
        return formatPolymorphicPopulate({
          assoc,
          prefix,
        });
      }

      return formatAssociationPopulate({ assoc, prefix });
    })
    .reduce((acc, val) => acc.concat(val), []);
};

const populateBareAssociations = (definition, { prefix = '' } = {}) => {
  return definition.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(assoc => {
      if (isPolymorphic({ assoc })) {
        return formatPolymorphicPopulate({
          assoc,
          prefix,
        });
      }

      const path = `${prefix}${assoc.alias}`;
      const assocModel = findModelByAssoc({ assoc });

      const polyAssocs = assocModel.associations
        .filter(assoc => isPolymorphic({ assoc }))
        .map(assoc =>
          formatPolymorphicPopulate({
            assoc,
            prefix: `${path}.`,
          })
        );

      return [path, ...polyAssocs];
    })
    .reduce((acc, val) => acc.concat(val), []);
};

const formatAssociationPopulate = ({ assoc, prefix = '' }) => {
  const path = `${prefix}${assoc.alias}`;
  const assocModel = findModelByAssoc({ assoc });

  const polyAssocs = assocModel.associations
    .filter(assoc => isPolymorphic({ assoc }))
    .map(assoc =>
      formatPolymorphicPopulate({
        assoc,
        prefix: `${path}.`,
      })
    );

  const components = populateComponents(assocModel, { prefix: `${path}.` });

  return [path, ...polyAssocs, ...components];
};

const populateComponents = (definition, { prefix = '' } = {}) => {
  return getComponentAttributes(definition)
    .map(key => {
      const attribute = definition.attributes[key];
      const autoPopulate = _.get(attribute, ['autoPopulate'], true);

      if (autoPopulate === true) {
        return populateComponent(key, attribute, { prefix });
      }
    }, [])
    .reduce((acc, val) => acc.concat(val), []);
};

const populateComponent = (key, attr, { prefix = '' } = {}) => {
  const path = `${prefix}${key}.component`;
  const componentPrefix = `${path}.`;

  if (attr.type === 'dynamiczone') {
    const componentKeys = attr.components;

    return componentKeys.reduce((acc, key) => {
      const component = strapi.components[key];
      const assocs = populateBareAssociations(component, {
        prefix: componentPrefix,
      });

      const components = populateComponents(component, {
        prefix: componentPrefix,
      });

      return acc.concat([path, ...assocs, ...components]);
    }, []);
  }

  const component = strapi.components[attr.component];
  const assocs = populateBareAssociations(component, {
    prefix: componentPrefix,
  });

  const components = populateComponents(component, {
    prefix: componentPrefix,
  });

  return [path, ...assocs, ...components];
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

  const finalObj = Object.keys(obj).reduce((acc, key) => {
    // check the key path and update it if necessary
    const parts = key.split('.');

    let newKey;
    let prefix = '';
    let tmpModel = definition;
    for (let part of parts) {
      const attr = tmpModel.attributes[part];

      if (isComponent(tmpModel, part)) {
        if (attr.type === 'dynamiczone') {
          const path = `${prefix}${part}.component`;
          newKey = path;
          break;
        }

        tmpModel = strapi.components[attr.component];
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

const formatPolymorphicPopulate = ({ assoc, prefix = '' }) => {
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
};

module.exports = populateFetch;
