module.exports = {

  find: async (params) => {
    const entries = params.model
      .find()
      .limit(Number(params.limit))
      .sort(params.sort)
      .skip(Number(params.skip));

    return entries;
  },

  count: async (params) => {
    const count = await params.model
      .count();

    return Number(count);
  },

  findOne: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .findOne(where);

    return entry;
  },

  create: async (params) => {
    const entry = await params.model
      .create(params.values);

    return entry;
  },

  update: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .update(where, params.values);

    return entry;
  },

  delete: async (params) => {
    const where = {};
    where[params.primaryKey] = params.id;

    const entry = await params.model
      .destroy(where);

    return entry;
  }
};