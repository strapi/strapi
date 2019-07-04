module.exports = {
  getGeneralSettings: ctx => {
    const generalSettings = {
      bulkActions: true,
      filters: true,
      pageEntries: 10,
      search: true,
    };

    ctx.body = { generalSettings };
  },
  getGroups: ctx => {
    const groups = [
      {
        name: 'ingredient',
      },
      {
        name: 'car',
      },
    ];

    ctx.body = { groups };
  },

  getModels: ctx => {
    const models = [
      {
        name: 'article',
        label: 'Article',
        destination: 'article',
      },
      {
        name: 'administrator',
        label: 'Administrator',
        destination: 'administrator',
        source: 'admin', // this should be removed at some point
        isDisplayed: false,
      },
      {
        name: 'user',
        label: 'Users',
        destination: 'user',
        source: 'users-permissions', // this should be removed at some point
        isDisplayed: true,
      },
    ];

    ctx.body = { models };
  },
};
