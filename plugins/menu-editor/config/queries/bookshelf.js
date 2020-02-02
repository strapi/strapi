// FIXME: eslint-disable
/* eslint-disable */

const bookshelf = require('bookshelf');

module.exports = model => ({
  findOne: async ({ id }) => await model.forge({ id }).fetch(),
  find: async () => await model.fetchAll(),
  putSourceMenu: async menu_items => {
    const Bookshelf = new bookshelf(strapi.connections.default);

    return await Bookshelf.knex.transaction(async trx => {
      try {
        await Bookshelf.knex('menu-editor_source_menu')
          .transacting(trx)
          .del();

        const test = await Bookshelf.knex('menu-editor_source_menu')
          .transacting(trx)
          .insert(menu_items);
        console.log(test);

        await trx.commit;
      } catch (error) {
        console.log(error);
        await trx.rollback;
      }
    });
  },
});
