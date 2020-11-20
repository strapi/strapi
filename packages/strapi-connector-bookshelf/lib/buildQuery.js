'use strict';

const _ = require('lodash');
const { singular } = require('pluralize');
const { toQueries, runPopulateQueries } = require('./utils/populate-queries');

const BOOLEAN_OPERATORS = ['or'];

/**
 * Build filters on a bookshelf query
 * @param {Object} options - Options
 * @param {Object} options.model - Bookshelf model
 * @param {Object} options.filters - Filters params (start, limit, sort, where)
 */
const buildQuery = ({ model, filters }) => qb => {
  if (_.has(filters, 'where') && Array.isArray(filters.where) && filters.where.length > 0) {
    qb.distinct();
    buildJoinsAndFilter(qb, model, filters);
  }

  if (_.has(filters, 'sort')) {
    qb.orderBy(
      filters.sort.map(({ field, order }) => ({
        column: field,
        order,
      }))
    );
  }

  if (_.has(filters, 'start')) {
    qb.offset(filters.start);
  }

  if (_.has(filters, 'limit') && filters.limit >= 0) {
    qb.limit(filters.limit);
  }

  if (_.has(filters, 'publicationState')) {
    runPopulateQueries(
      toQueries({ publicationState: { query: filters.publicationState, model } }),
      qb
    );
  }
};

/**
 * Add joins and where filters
 * @param {Object} qb - knex query builder
 * @param {Object} model - Bookshelf model
 * @param {Object} filters - The query filters
 */
const buildJoinsAndFilter = (qb, model, filters) => {
  const { where: whereClauses } = filters;

  /**
   * Returns an alias for a name (simple incremental alias name)
   * @param {string} name - name to alias
   */
  const aliasMap = {};
  const generateAlias = name => {
    if (!aliasMap[name]) {
      aliasMap[name] = 1;
    }

    const alias = `${name}_${aliasMap[name]}`;
    aliasMap[name] += 1;
    return alias;
  };

  /**
   * Build a query joins and where clauses from a query tree
   * @param {Object} qb - Knex query builder
   * @param {Object} tree - Query tree
   */
  const buildJoinsFromTree = (qb, queryTree) => {
    // build joins
    Object.keys(queryTree.joins).forEach(key => {
      const subQueryTree = queryTree.joins[key];
      buildJoin(qb, subQueryTree.assoc, queryTree, subQueryTree);

      buildJoinsFromTree(qb, subQueryTree);
    });
  };

  /**
   * Add table joins
   * @param {Object} qb - Knex query builder
   * @param {Object} assoc - Models association info
   * @param {Object} originInfo - origin from which you are making a join
   * @param {Object} destinationInfo - destination with which we are making a join
   */
  const buildJoin = (qb, assoc, originInfo, destinationInfo) => {
    if (['manyToMany', 'manyWay'].includes(assoc.nature)) {
      const joinTableAlias = generateAlias(assoc.tableCollectionName);

      let originColumnNameInJoinTable;
      if (assoc.nature === 'manyToMany') {
        originColumnNameInJoinTable = `${joinTableAlias}.${singular(
          destinationInfo.model.attributes[assoc.via].attribute
        )}_${destinationInfo.model.attributes[assoc.via].column}`;
      } else if (assoc.nature === 'manyWay') {
        originColumnNameInJoinTable = `${joinTableAlias}.${singular(
          originInfo.model.collectionName
        )}_${originInfo.model.primaryKey}`;
      }

      qb.leftJoin(
        `${originInfo.model.databaseName}.${assoc.tableCollectionName} AS ${joinTableAlias}`,
        originColumnNameInJoinTable,
        `${originInfo.alias}.${originInfo.model.primaryKey}`
      );

      qb.leftJoin(
        `${destinationInfo.model.databaseName}.${destinationInfo.model.collectionName} AS ${destinationInfo.alias}`,
        `${joinTableAlias}.${singular(originInfo.model.attributes[assoc.alias].attribute)}_${
          originInfo.model.attributes[assoc.alias].column
        }`,
        `${destinationInfo.alias}.${destinationInfo.model.primaryKey}`
      );
    } else {
      const externalKey =
        assoc.type === 'collection'
          ? `${destinationInfo.alias}.${assoc.via || destinationInfo.model.primaryKey}`
          : `${destinationInfo.alias}.${destinationInfo.model.primaryKey}`;

      const internalKey =
        assoc.type === 'collection'
          ? `${originInfo.alias}.${originInfo.model.primaryKey}`
          : `${originInfo.alias}.${assoc.alias}`;

      qb.leftJoin(
        `${destinationInfo.model.databaseName}.${destinationInfo.model.collectionName} AS ${destinationInfo.alias}`,
        externalKey,
        internalKey
      );
    }
  };

  /**
   * Create a query tree node from a key an assoc and a model
   * @param {Object} model - Strapi model
   * @param {Object} assoc - Strapi association
   */
  const createTreeNode = (model, assoc = null) => {
    return {
      alias: generateAlias(model.collectionName),
      assoc,
      model,
      joins: {},
    };
  };

  // tree made to create the joins structure
  const tree = {
    alias: model.collectionName,
    assoc: null,
    model,
    joins: {},
  };

  /**
   * Returns the SQL path for a qery field.
   * Adds table to the joins tree
   * @param {string} field a field used to filter
   * @param {Object} tree joins tree
   */
  const generateNestedJoins = (field, tree) => {
    let [key, ...parts] = field.split('.');

    const assoc = findAssoc(tree.model, key);
    // if the key is an attribute add as where clause
    if (!assoc) {
      return `${tree.alias}.${key}`;
    }

    const assocModel = strapi.db.getModelByAssoc(assoc);

    // if the last part of the path is an association
    // add the primary key of the model to the parts
    if (parts.length === 0) {
      parts = [assocModel.primaryKey];
    }

    // init sub query tree
    if (!tree.joins[key]) {
      tree.joins[key] = createTreeNode(assocModel, assoc);
    }

    return generateNestedJoins(parts.join('.'), tree.joins[key]);
  };

  /**
   * Format every where clauses whith the right table name aliases.
   * Add table joins to the joins list
   * @param {Array<{field, operator, value}>} whereClauses a list of where clauses
   * @param {Object} context
   * @param {Object} context.model model on which the query is run
   */
  const buildWhereClauses = (whereClauses, { model }) => {
    return whereClauses.map(whereClause => {
      const { field, operator, value } = whereClause;

      if (BOOLEAN_OPERATORS.includes(operator)) {
        return { field, operator, value: value.map(v => buildWhereClauses(v, { model })) };
      }

      const path = generateNestedJoins(field, tree);

      return {
        field: path,
        operator,
        value,
      };
    });
  };

  /**
   * Add queries on tree's joins (deep search) based on given filters
   * @param tree - joins tree
   */
  const addFiltersQueriesToJoinTree = tree => {
    _.each(tree.joins, value => {
      const { alias, model } = value;

      runPopulateQueries(
        toQueries({
          publicationState: { query: filters.publicationState, model, alias },
        }),
        qb
      );
      addFiltersQueriesToJoinTree(value);
    });
  };

  const aliasedWhereClauses = buildWhereClauses(whereClauses, { model });
  aliasedWhereClauses.forEach(w => buildWhereClause({ qb, ...w }));

  buildJoinsFromTree(qb, tree);
  addFiltersQueriesToJoinTree(tree);
};

/**
 * Builds a sql where clause
 * @param {Object} options - Options
 * @param {Object} options.qb - Bookshelf (knex) query builder
 * @param {Object} options.model - Bookshelf model
 * @param {Object} options.field - Filtered field
 * @param {Object} options.operator - Filter operator (=,in,not eq etc..)
 * @param {Object} options.value - Filter value
 */
const buildWhereClause = ({ qb, field, operator, value }) => {
  if (Array.isArray(value) && !['or', 'in', 'nin'].includes(operator)) {
    return qb.where(subQb => {
      for (let val of value) {
        subQb.orWhere(q => buildWhereClause({ qb: q, field, operator, value: val }));
      }
    });
  }

  switch (operator) {
    case 'or':
      return qb.where(orQb => {
        value.forEach(orClause => {
          orQb.orWhere(subQb => {
            if (Array.isArray(orClause)) {
              orClause.forEach(orClause =>
                subQb.where(andQb => buildWhereClause({ qb: andQb, ...orClause }))
              );
            } else {
              buildWhereClause({ qb: subQb, ...orClause });
            }
          });
        });
      });
    case 'eq':
      return qb.where(field, value);
    case 'ne':
      return qb.where(field, '!=', value);
    case 'lt':
      return qb.where(field, '<', value);
    case 'lte':
      return qb.where(field, '<=', value);
    case 'gt':
      return qb.where(field, '>', value);
    case 'gte':
      return qb.where(field, '>=', value);
    case 'in':
      return qb.whereIn(field, Array.isArray(value) ? value : [value]);
    case 'nin':
      return qb.whereNotIn(field, Array.isArray(value) ? value : [value]);
    case 'contains':
      return qb.whereRaw('LOWER(??) LIKE LOWER(?)', [field, `%${value}%`]);
    case 'ncontains':
      return qb.whereRaw('LOWER(??) NOT LIKE LOWER(?)', [field, `%${value}%`]);
    case 'containss':
      return qb.where(field, 'like', `%${value}%`);
    case 'ncontainss':
      return qb.whereNot(field, 'like', `%${value}%`);
    case 'null': {
      return value ? qb.whereNull(field) : qb.whereNotNull(field);
    }

    default:
      throw new Error(`Unhandled whereClause : ${field} ${operator} ${value}`);
  }
};

const findAssoc = (model, key) => model.associations.find(assoc => assoc.alias === key);

module.exports = buildQuery;
