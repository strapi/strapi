const bookshelf = require('bookshelf');

module.exports = model => ({
  findOne: async ({ id }) => await model.forge({ id }).fetch(),
  find: async () => await model.fetchAll(),
  putSourceMenu: async menu_items => {
    const Bookshelf = new bookshelf(strapi.connections.default);
    //TODO catch errors
    //return await Bookshelf.knex.transaction(async trx => {
    //  try {
    //    await Bookshelf.knex('menu-editor_source_menu')
    //      .transacting(trx)
    //      .del();

    //    await Bookshelf.knex('menu-editor_source_menu')
    //      .transacting(trx)
    //      .insert(menu_items);

    //    await trx.commit;
    //  } catch (error) {
    //    await trx.rollback;
    //  }
    //});
    //let newMenuItems = []
    //let updateMenuItems = []

    //menu_items.forEach(item => {
    //  if (typeof item.id === "string") {
    //    return newMenuItems.push({
    //      ...item,
    //      id: null,
    //    })
    //  }

    //  return updateMenuItems.push(item)
    //})

    //const newMenuItems = menu_items.filter(item => Number.isNaN(parseInt(item.id)))
    //const updateMenuItems = menu_items.filter(item => !Number.isNaN(parseInt(item.id)))

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
