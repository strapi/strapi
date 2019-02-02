const _ = require("lodash");

const buildTempFieldPath = field => {
  return `__${field}`;
};

const restoreRealFieldPath = (field, prefix) => {
  return `${prefix}${field}`;
};

class QueryBuilder {
  constructor() {
    this.buildQueryJoins = this.buildQueryJoins.bind(this);
    this.buildQueryFilter = this.buildQueryFilter.bind(this);
  }

  populateAssociation(ast, prefixPath = '') {
    const stages = [];
    const { models } = ast.plugin ? strapi.plugins[ast.plugin] : strapi;
    const model = models[ast.collection || ast.model];

    // Make sure that the model is defined (it'll not be defined in case of related association in upload plugin)
    if (!model) {
      return stages;
    }

    const from = model.collectionName;
    const isDominantAssociation =
      (ast.dominant && ast.nature === "manyToMany") || !!ast.model;

    const _localField =
      !isDominantAssociation || ast.via === "related" ? "_id" : ast.alias;

    const localField = `${prefixPath}${_localField}`;

    const foreignField = ast.filter
      ? `${ast.via}.ref`
      : isDominantAssociation
      ? "_id"
      : ast.via;

    // Add the juncture like the `.populate()` function
    const asTempPath = buildTempFieldPath(ast.alias, prefixPath);
    const asRealPath = restoreRealFieldPath(ast.alias, prefixPath);

    if (ast.plugin === 'upload') {
      // Filter on the correct upload field
      stages.push({
        $lookup: {
          from,
          let: { local_id: `$${localField}` },
          pipeline: [
            { $unwind: { path: `$${ast.via}`, preserveNullAndEmptyArrays: true } },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [`$${foreignField}`, '$$local_id'] },
                    { $eq: [`$${ast.via}.${ast.filter}`, ast.alias] }
                  ]
                }
              }
            }
          ],
          as: asTempPath
        }
      });
    } else {
      stages.push({
        $lookup: {
          from,
          localField,
          foreignField,
          as: asTempPath
        }
      });
    }

    // Unwind the relation's result if only one is expected
    if (ast.type === "model") {
      stages.push({
        $unwind: {
          path: `$${asTempPath}`,
          preserveNullAndEmptyArrays: true
        }
      });
    }

    // Preserve relation field if it is empty
    stages.push({
      $addFields: {
        [asRealPath]: {
          $ifNull: [`$${asTempPath}`, null]
        }
      }
    });

    // Remove temp field
    stages.push({
      $project: {
        [asTempPath]: 0
      }
    });

    return stages;
  }

  /**
   * Returns an array of relations to populate
   */
  buildQueryJoins(strapiModel, { whitelistedPopulate = null, prefixPath = '' } = {}) {
    return _.chain(strapiModel.associations)
      .filter(ast => {
        // Included only whitelisted relation if needed
        if (whitelistedPopulate) {
          return _.includes(whitelistedPopulate, ast.alias);
        }
        return ast.autoPopulate;
      })
      .map(ast => this.populateAssociation(ast, prefixPath))
      .flatten()
      .value();
  }

  /**
   * Returns an array of filters to apply to the model
   */
  buildQueryFilter(strapiModel, where) {
    if (_.isEmpty(where)) {
      return;
    }

    const joins = this.buildJoinsFromWhere(strapiModel, where);

    const filters = _.map(where, (value, fieldPath) => ({
      $match: { [fieldPath]: value }
    }));

    return [...joins, ...filters];
  }


  /**
   * Returns an object containing the association and its corresponding model from a given field id
   * @param {MongooseModel} strapiModel
   * @param {string} fieldId
   *
   * @example
   * strapiModel = Post
   * fieldId = 'author.company'
   * // => {
   *  association: CompanyAssociation
   *  model: CompanyModel
   * }
   *
   * @example
   * strapiModel = Post
   * fieldId = 'author.company.name'
   * // => {} Because "name" is not an association of company, it's a primitive field.
   */
  getAssociationFromField(strapiModel, fieldId) {
    const associationParts = fieldId.split(".");
    let association;
    let currentModel = strapiModel;
    _.forEach(associationParts, astPart => {
      association = currentModel.associations.find(
        a => a.alias === astPart
      );

      if (association) {
        const { models } = association.plugin ? strapi.plugins[association.plugin] : strapi;
        currentModel = models[association.collection || association.model];
      }
    });

    if (association) {
      return {
        association,
        model: currentModel,
      };
    }

    return {};
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

  buildJoinsFromWhere(strapiModel, where) {
    const relationToPopulate = this.extractRelationsFromWhere(where);
    let result = [];
    _.forEach(relationToPopulate, (fieldPath) => {
      const associationParts = fieldPath.split(".");

      let currentModel = strapiModel;
      let nextPrefixedPath = '';
      _.forEach(associationParts, astPart => {
        const association = currentModel.associations.find(
          a => a.alias === astPart
        );

        if (association) {
          const { models } = association.plugin ? strapi.plugins[association.plugin] : strapi;
          const model = models[association.collection || association.model];

          // Generate lookup for this relation
          result.push(
            ...this.buildQueryJoins(currentModel, {
              whitelistedPopulate: [astPart],
              prefixPath: nextPrefixedPath
            })
          );

          currentModel = model;
          nextPrefixedPath += `${astPart}.`;
        }
      });
    });

    return result;
  }
}

module.exports = new QueryBuilder();
