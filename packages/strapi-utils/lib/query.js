function Query(model, { strapi = global.strapi } = {}) {
  const hook = strapi.hook[model.orm];
  const ORMQuery = hook.load().Query;

  return new ORMQuery(model);
}

module.exports = Query;
