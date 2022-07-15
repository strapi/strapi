export const permissions = {
  collectionTypes: {
    'api::category': {
      create: false,
      findOne: false,
      find: false,
      update: false,
      delete: false,
    },
    'api::country': {
      create: false,
      findOne: false,
      find: false,
      update: false,
      delete: false,
    },
  },
  singleTypes: {
    'api::homepage': {
      delete: false,
      find: false,
      update: false,
    },
  },
};

export const data = {
  sections: {
    collectionTypes: {
      subjects: [
        {
          uid: 'api::category.category',
          label: 'Category',
          ' actions': [
            {
              label: 'Create',
              actionId: 'api-token.create',
            },
            {
              label: 'FindOne',
              actionId: 'api-token.find-one',
            },
          ],
        },
        {
          uid: 'api::country.country',
          label: 'Country',
          actions: [
            {
              label: 'Create',
              actionId: 'api-token.create',
            },
            {
              label: 'FindOne',
              actionId: 'api-token.find-one',
            },
          ],
        },
      ],
    },
    singleTypes: {
      subjects: [
        {
          uid: 'api::homepage.homepage',
          label: 'Homepage',
          actions: [
            {
              label: 'Create',
              actionId: 'api-token.create',
            },
          ],
        },
      ],
    },
  },
};
