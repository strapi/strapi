module.exports = {
  getGeneralSettings: ctx => {
    const generalSettings = {
      bulkable: true,
      filters: true,
      pageSize: 20,
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

  getLayout: ctx => {
    const layouts = {
      ingredient: {
        uid: 'ingredient',
        schema: {
          connection: 'default',
          collectionName: 'ingredients',
          info: {
            name: 'ingredient',
            description: '',
          },
          options: {
            increments: true,
            timestamps: true,
            comment: '',
          },
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
        settings: {
          mainField: 'id',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
          searchable: true,
          filterable: false,
          bulkable: true,
          pageSize: 10,
        },
        metadata: {
          name: {
            list: {},
            edit: {
              label: 'name',
              description: '....',
              editable: true,
              visible: true,
            },
          },
        },
        layouts: {
          list: [],
          editRelations: [],
          edit: [
            [
              {
                name: 'name',
                size: 6,
              },
            ],
          ],
        },
      },
      recipe: {
        uid: 'recipe',
        schema: {
          connection: 'default',
          collectionName: 'recipes',
          info: {
            name: 'recipe',
            description: '',
          },
          options: {
            increments: true,
            timestamps: true,
            comment: '',
          },
          attributes: {
            title: {
              type: 'string',
            },
            ingredients: {
              type: 'group',
              group: 'ingredient',
              required: true,
              repeatable: true,
              min: 1,
              max: 20,
            },
          },
        },
        settings: {
          mainField: 'id',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
          searchable: true,
          filterable: false,
          bulkable: true,
          pageSize: 10,
        },
        metadata: {
          title: {
            list: {
              label: 'Title',
              searchable: true,
              sortable: true,
            },
            edit: {
              label: 'Title',
              description: '....',
              editable: true,
              visible: true,
            },
          },
          ingredients: {
            list: {},
            edit: {
              label: 'ingredients',
              description: '....',
              editable: true,
              visible: true,
            },
          },
        },
        layouts: {
          list: ['title'],
          editRelations: [],
          edit: [
            [
              {
                name: 'title',
                size: 6,
              },
            ],
            [
              {
                name: 'ingredients',
                size: 12,
              },
            ],
          ],
        },
      },
      tag: {
        uid: 'tag',
        schema: {
          // good old schema
          connection: 'default',
          collectionName: 'tags',
          options: {},
          infos: {
            name: 'tag',
            description: '',
          },
          attributes: {
            name: {
              type: 'string',
            },

            articles: {
              type: 'relation',
              relationType: 'manyToMany',
            },
          },
        },
        settings: {
          mainField: 'id',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
          searchable: true,
          filterable: false,
          bulkable: true,
          pageSize: 10,
        },
        metadata: {
          id: {
            edit: {},
            list: {
              label: 'Id',
              searchable: true,
              sortable: true,
            },
          },
          name: {
            edit: {
              label: 'name',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'Name',
              searchable: true,
              sortable: true,
            },
          },
          articles: {
            edit: {
              label: 'articles',
              description: '....',
              editable: true,
              visible: true,
              mainField: 'id',
            },
            list: {},
          },
        },
        layouts: {
          list: ['id', 'name'],
          editRelations: ['articles'],
          edit: [
            [
              {
                name: 'name',
                size: 6,
              },
            ],
          ],
        },
      },
      article: {
        uid: 'article',
        schema: {
          // good old schema
          connection: 'default',
          collectionName: 'articles',
          options: {},
          infos: {
            name: 'article',
            description: '',
          },
          attributes: {
            title: {
              type: 'string',
              default: 'soupette',
              required: true,
              unique: true,
            },
            content: {
              type: 'text',
            },
            json: {
              type: 'json',
            },
            number: {
              type: 'integer',
            },
            date: {
              type: 'date',
            },
            enum: {
              enum: ['morning,', 'noon'],
              type: 'enumeration',
              default: 'noon',
            },
            pic: {
              model: 'file',
              via: 'related',
              plugin: 'upload',
            },
            bool: {
              type: 'boolean',
            },
            tags: {
              type: 'relation',
              relationType: 'manyToMany',
            },
            pics: {
              collection: 'file',
              via: 'related',
              plugin: 'upload',
            },
          },
        },
        settings: {
          mainField: 'title',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
          searchable: true,
          filterable: true,
          bulkable: true,
          pageSize: 10,
        },
        metadata: {
          id: {
            edit: {},
            list: {
              label: 'Id',
              searchable: true,
              sortable: true,
            },
          },
          title: {
            edit: {
              label: 'title',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'title',
              searchable: true,
              sortable: false,
            },
          },
          content: {
            edit: {
              label: 'content',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'content',
              searchable: true,
              sortable: true,
            },
          },
          json: {
            edit: {
              label: 'json',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {},
          },
          number: {
            edit: {
              label: 'number',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'number',
              searchable: true,
              sortable: true,
            },
          },
          date: {
            edit: {
              label: 'date',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'date',
              searchable: true,
              sortable: true,
            },
          },
          enum: {
            edit: {
              label: 'enum',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'enum',
              searchable: true,
              sortable: true,
            },
          },
          pic: {
            edit: {
              label: 'pic',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {},
          },
          pics: {
            edit: {
              label: 'pics',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {},
          },
          tags: {
            edit: {
              label: 'tags',
              description: '....',
              editable: true,
              visible: true,
              mainField: 'name',
            },
            list: {},
          },
          bool: {
            edit: {
              label: 'bool',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'bool',
              searchable: true,
              sortable: true,
            },
          },
        },
        layouts: {
          list: ['id', 'title', 'content'],
          editRelations: ['tags'],
          edit: [
            [
              {
                name: 'title',
                size: 6,
              },
              {
                name: 'content',
                size: 6,
              },
            ],
            [{ name: 'pics', size: 6 }, { name: 'pic', size: 6 }],
            [{ name: 'number', size: 6 }, { name: 'date', size: 4 }],
            [{ name: 'bool', size: 4 }, { name: 'enum', size: 6 }],
            [{ name: 'json', size: 12 }],
          ],
        },
      },
      user: {
        uid: 'user',
        schema: {
          // good old schema
          connection: 'default',
          collectionName: 'users-permissions_user',
          info: {
            name: 'user',
            description: '',
          },
          attributes: {
            username: {
              type: 'string',
              minLength: 3,
              unique: true,
              configurable: false,
              required: true,
            },
            email: {
              type: 'email',
              minLength: 6,
              configurable: false,
              required: true,
            },
            provider: {
              type: 'string',
              configurable: false,
            },
            password: {
              type: 'password',
              minLength: 6,
              configurable: false,
              private: true,
            },
            resetPasswordToken: {
              type: 'string',
              configurable: false,
              private: true,
            },
            confirmed: {
              type: 'boolean',
              default: false,
              configurable: false,
            },
            blocked: {
              type: 'boolean',
              default: false,
              configurable: false,
            },
            role: {
              type: 'relation',
              relationType: 'manyToOne',
            },
          },
        },
        settings: {
          mainField: 'id',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
          searchable: true,
          filterable: true,
          bulkable: true,
          pageSize: 10,
        },
        metadata: {
          id: {
            edit: {},
            list: {
              label: 'Id',
              searchable: true,
              sortable: true,
            },
          },
          username: {
            edit: {
              label: 'username',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'username',
              searchable: true,
              sortable: true,
            },
          },
          email: {
            edit: {
              label: 'email',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'email',
              searchable: true,
              sortable: true,
            },
          },
          provider: {
            edit: {
              label: 'provider',
              description: '....',
              editable: true,
              visible: true,
            },
            list: {
              label: 'provider',
              searchable: true,
              sortable: true,
            },
            confirmed: {
              edit: {
                label: 'confirmed',
                description: '....',
                editable: true,
                visible: true,
              },
              list: {
                label: 'confirmed',
                searchable: true,
                sortable: true,
              },
            },
            blocked: {
              edit: {
                label: 'blocked',
                description: '....',
                editable: true,
                visible: true,
              },
              list: {
                label: 'blocked',
                searchable: true,
                sortable: true,
              },
            },
            role: {
              edit: {
                label: 'role',
                description: '....',
                editable: true,
                visible: true,
                mainField: 'name',
              },
              list: {},
            },
          },
        },
        layouts: {
          list: ['id', 'username', 'email'],
          editRelations: ['role'],
          edit: [
            [
              {
                name: 'username',
                size: 6,
              },
              {
                name: 'email',
                size: 6,
              },
              {
                name: 'provider',
                size: 6,
              },
              {
                name: 'password',
                size: 6,
              },
              {
                name: 'confirmed',
                size: 4,
              },
              {
                name: 'blocked',
                size: 4,
              },
            ],
          ],
        },
      },
    };

    ctx.body = { layout: layouts[ctx.params.uid] };
  },

  getModels: ctx => {
    const models = [
      {
        name: 'article',
        label: 'Article',
        destination: 'article',
      },
      {
        name: 'recipe',
        label: 'Recipe',
        destination: 'recipe',
      },
      {
        name: 'tag',
        label: 'Tag',
        destination: 'tag',
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

  updateGeneralSettings: ctx => {
    // Here it should update all the other settings
    ctx.body = { ok: true };
  },

  updateLayout: ctx => {
    // Update specific layout
    ctx.body = { ok: true };
  },
};
