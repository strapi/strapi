const _ = require('lodash');

class QueryBuilder {
  constructor() {
    this.buildQueryJoins = this.buildQueryJoins.bind(this);
    this.buildQueryFilter = this.buildQueryFilter.bind(this);
  }

  // Converting JSON filter to Bookshelf Query
  buildQueryFilter(qb) {
    return (strapiModel, filters) => {
      _.forEach(filters, (value, key) => {
        const { association, model, attributeKey } = this.getAssociationFromFieldKey(strapiModel, key);
        let fieldKey = `${model.collectionName}.${attributeKey}`;
        if (association) {
          if (association.nature === 'manyToMany') {
            const { attribute, column } = model.attributes[key];
            fieldKey = `${association.tableCollectionName}.${attribute}_${column}`;
          }
        }

        if (value.symbol) {
          qb[value.method](fieldKey, value.symbol, value.value);
        } else if (!_.isUndefined(value.value)) {
          qb[value.method](fieldKey, value.value);
        } else {
          qb[value.method](fieldKey);
        }
      });
    };
  }

  /**
   * Extract the minimal relation to populate
   * @example
   * where = {
    *   "role.name": "administrator",
    *   "subjects.code": "S1",
    *   "organization.name": "strapi",
    *   "organization.creator.name": "admin",
    *   "organization.courses.code": "C1",
    *   "organization.courses.batches.code": "B1",
    *   "organization.subjects.teachers.code": "T1",
    * };
    * // =>
    *  [
    *  'role',
    *  'subjects',
    *  'organization.creator',
    *  'organization.courses.batches',
    *  'organization.subjects.teachers',
    *  ]
    */
  extractRelationsFromWhere(where) {
    return _.chain(where)
      .keys()
      .map(field => {
        const parts = field.split('.');
        return _.size(parts) === 1 ? field : _.initial(parts).join('.');
      })
      .flatten()
      .sort()
      .reverse()
      .reduce((acc, currentValue) => {
        const alreadyPopulated = _.some(acc, item => _.startsWith(item, currentValue));
        if (!alreadyPopulated) {
          acc.push(currentValue);
        }
        return acc;
      }, [])
      .value();
  }

  // Perform multiple joins depending on the provided filter
  buildQueryJoins(qb) {
    return (strapiModel, where) => {
      const relationToPopulate = this.extractRelationsFromWhere(where);
      _.forEach(relationToPopulate, (fieldPath) => {
        const associationParts = fieldPath.split(".");

        let currentModel = strapiModel;
        _.forEach(associationParts, astPart => {
          const { association, model } = this.getAssociationFromFieldKey(currentModel, astPart);

          if (association) {
            this.buildSingleJoin(qb)(currentModel, model, association);
            currentModel = model;
          }
        });
      });
    };
  }

  // Perform a single join on the query
  buildSingleJoin(qb) {
    return (strapiModel, astModel, association) => {
      const relationTable = astModel.collectionName;

      qb.distinct();

      if (association.nature === 'manyToMany') {
        // Join on both ends
        qb.innerJoin(
          association.tableCollectionName,
          `${association.tableCollectionName}.${strapiModel.info.name}_${strapiModel.primaryKey}`,
          `${strapiModel.collectionName}.${strapiModel.primaryKey}`,
        );

        qb.innerJoin(
          relationTable,
          `${association.tableCollectionName}.${strapiModel.attributes[key].attribute}_${strapiModel.attributes[key].column}`,
          `${relationTable}.${astModel.primaryKey}`,
        );
      } else {
        const externalKey = association.type === 'collection'
          ? `${relationTable}.${association.via}`
          : `${relationTable}.${astModel.primaryKey}`;

        const internalKey = association.type === 'collection'
          ? `${strapiModel.collectionName}.${strapiModel.primaryKey}`
          : `${strapiModel.collectionName}.${association.alias}`;

        qb.innerJoin(relationTable, externalKey, internalKey);
      }
    };
  }

  // Returns the association and model objects from the fieldKey
  getAssociationFromFieldKey(strapiModel, fieldKey) {
    const parts = fieldKey.split('.');
    let model = strapiModel;
    let association;
    let attributeKey;
    _.forEach(parts, (key) => {
      attributeKey = key;
      const attribute = model.attributes[key];
      // An association attribute does not have type it has only model/via or collection/via keys
      const isAssociationAttribute = attribute && !attribute.type;
      if (isAssociationAttribute) {
        association = model.associations.find(ast => ast.alias === key);
        if (association) {
          const { models } = strapi.plugins[association.plugin] || strapi;
          model = models[association.model || association.collection];
        }
      }
    });

    return {
      association,
      model,
      attributeKey
    };
  }
}

module.exports = new QueryBuilder();
