'use strict';

const _ = require('lodash');
const pq = require('./utils/populate-queries');
const { getComponentAttributes, isComponent } = require('./utils/attributes');
const { isPolymorphic } = require('./utils/associations');

/**
 * Create utilities to populate a model on fetch
 */

const populateFetch = (definition, options) => {
  // do not populate anything
  if (options.withRelated === false) return;
  if (options.isEager === true) return;

  if (_.isNil(options.withRelated)) {
    options.withRelated = []
      .concat(populateComponents(definition, options))
      .concat(populateAssociations(definition, options));
  } else if (_.isEmpty(options.withRelated)) {
    options.withRelated = populateComponents(definition, options);
  } else {
    options.withRelated = []
      .concat(formatPopulateOptions(definition, options))
      .concat(populateComponents(definition, options));
  }
};

const populateAssociations = (definition, { prefix = '', publicationState } = {}) => {
  return definition.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(assoc => {
      if (isPolymorphic({ assoc })) {
        return formatPolymorphicPopulate({
          assoc,
          prefix,
          publicationState,
        });
      }

      return formatAssociationPopulate({ assoc }, { prefix, publicationState });
    })
    .reduce((acc, val) => acc.concat(val), []);
};

const populateBareAssociations = (definition, { prefix = '', publicationState } = {}) => {
  return (definition.associations || [])
    .filter(ast => ast.autoPopulate !== false)
    .map(assoc => {
      if (isPolymorphic({ assoc })) {
        return formatPolymorphicPopulate({
          assoc,
          prefix,
          publicationState,
        });
      }

      const path = `${prefix}${assoc.alias}`;
      const assocModel = strapi.db.getModelByAssoc(assoc);

      const polyAssocs = assocModel.associations
        .filter(assoc => isPolymorphic({ assoc }))
        .map(assoc =>
          formatPolymorphicPopulate({
            assoc,
            prefix: `${path}.`,
            publicationState,
          })
        );

      return [
        pq.bindPopulateQueries([path], {
          publicationState: { query: publicationState, model: assocModel },
        }),
        ...polyAssocs,
      ];
    })
    .reduce((acc, val) => acc.concat(val), []);
};

const formatAssociationPopulate = ({ assoc, prefix = '' }, options = {}) => {
  const { publicationState } = options;
  const path = `${prefix}${assoc.alias}`;
  const assocModel = strapi.db.getModelByAssoc(assoc);

  const polyAssocs = assocModel.associations
    .filter(assoc => isPolymorphic({ assoc }))
    .map(assoc =>
      formatPolymorphicPopulate({
        assoc,
        prefix: `${path}.`,
        publicationState,
      })
    );

  const components = populateComponents(assocModel, { prefix: `${path}.`, publicationState });

  return [
    pq.bindPopulateQueries([path], {
      publicationState: { query: publicationState, model: assocModel },
    }),
    ...polyAssocs,
    ...components,
  ];
};

const populateComponents = (definition, { prefix = '', publicationState } = {}) => {
  return getComponentAttributes(definition)
    .map(key => {
      const attribute = definition.attributes[key];
      const autoPopulate = _.get(attribute, ['autoPopulate'], true);

      if (autoPopulate === true) {
        return populateComponent(key, attribute, { prefix, publicationState });
      }
    }, [])
    .reduce((acc, val) => acc.concat(val), []);
};

const populateComponent = (key, attr, { prefix = '', publicationState } = {}) => {
  const path = `${prefix}${key}.component`;
  const componentPrefix = `${path}.`;

  if (attr.type === 'dynamiczone') {
    const componentKeys = attr.components;

    return componentKeys.reduce((acc, key) => {
      const component = strapi.components[key];
      const assocs = populateBareAssociations(component, {
        prefix: componentPrefix,
        publicationState,
      });

      const components = populateComponents(component, {
        prefix: componentPrefix,
        publicationState,
      });

      return acc.concat([path, ...assocs, ...components]);
    }, []);
  }

  const component = strapi.components[attr.component];
  const assocs = populateBareAssociations(component, {
    prefix: componentPrefix,
    publicationState,
  });

  const components = populateComponents(component, {
    prefix: componentPrefix,
    publicationState,
  });

  return [path, ...assocs, ...components];
};

const formatPopulateOptions = (definition, { withRelated, publicationState } = {}) => {
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
          newKey = `${prefix}${part}.component`;
          break;
        }

        tmpModel = strapi.components[attr.component];
        // add component path and there relations / images
        newKey = `${prefix}${part}.component`;
        prefix = `${newKey}.`;
        continue;
      }

      const assoc = tmpModel.associations.find(association => association.alias === part);

      if (!assoc) return acc;

      tmpModel = strapi.db.getModelByAssoc(assoc);

      if (isPolymorphic({ assoc })) {
        const path = formatPolymorphicPopulate({
          assoc,
          prefix,
          publicationState,
        });

        return _.extend(acc, path);
      }

      newKey = `${prefix}${part}`;
      prefix = `${newKey}.`;

      _.extend(acc, {
        [newKey]: pq.extendWithPopulateQueries([obj[newKey], acc[newKey]], {
          publicationState: { query: publicationState, model: tmpModel },
        }),
      });
    }

    return acc;
  }, {});

  return [finalObj];
};

const formatPolymorphicPopulate = ({ assoc, prefix = '', publicationState }) => {
  const model = strapi.db.getModelByAssoc(assoc);
  const populateOptions = {
    publicationState: { query: publicationState, model },
  };

  // MorphTo side.
  if (assoc.related) {
    return pq.bindPopulateQueries([`${prefix}${assoc.alias}.related`], populateOptions);
  }

  // oneToMorph or manyToMorph side.
  // Retrieve collection name because we are using it to build our hidden model.
  const path = `${prefix}${assoc.alias}.${model.collectionName}`;

  return {
    [path]: pq.extendWithPopulateQueries(
      [
        qb => {
          qb.orderBy('created_at', 'desc');
        },
      ],
      populateOptions
    ),
  };
};

module.exports = populateFetch;
