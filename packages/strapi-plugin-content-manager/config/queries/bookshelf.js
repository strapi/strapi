module.exports = {

  find: async (params) => {
    const entries = await params.model
      .forge()
      .query((qb) => {
        qb.limit(Number(params.limit));
        qb.orderBy(params.sort);
        qb.offset(Number(params.skip));

        if (params.query && params.queryAttribute) {
          qb.whereRaw(`LOWER(${params.queryAttribute}) LIKE '%' || LOWER(?) || '%'`, params.query);
        }
      })
      .fetchAll({
        withRelated: _.map(params.model.associations, 'alias')
      });

    return entries;
  },

  count: async (params) => {
    const count = await params.model
      .forge()
      .count();

    return Number(count);
  },

  findOne: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .forge(where)
      .fetch();

    return entry;
  },

  create: async (params) => {
    const entry = await params.model
      .forge()
      .save(params.values);

    return entry;
  },

  update: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .forge(where)
      .save(params.values, {patch: true});

    return entry;
  },

  delete: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .forge(where)
      .destroy();

    return entry;
  }
};