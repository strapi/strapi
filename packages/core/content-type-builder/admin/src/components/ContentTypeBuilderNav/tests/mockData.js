export default [
  {
    name: 'models',
    title: {
      id: 'content-type-builder.menu.section.models.name.',
      defaultMessage: 'Collection Types',
    },
    customLink: {
      id: 'content-type-builder.button.model.create',
      defaultMessage: 'Create new collection type',
    },
    links: [
      {
        visible: true,
        name: 'application::address.address',
        title: 'address',
        plugin: null,
        uid: 'application::address.address',
        to: '/plugins/content-type-builder/content-types/application::address.address',
        kind: 'collectionType',
        restrictRelationsTo: null,
      },
      {
        visible: true,
        name: 'application::category.category',
        title: 'category',
        plugin: null,
        uid: 'application::category.category',
        to: '/plugins/content-type-builder/content-types/application::category.category',
        kind: 'collectionType',
        restrictRelationsTo: null,
      },
    ],
  },
  {
    name: 'singleTypes',
    title: {
      id: 'content-type-builder.menu.section.single-types.name.',
      defaultMessage: 'Single Types',
    },
    customLink: {
      id: 'content-type-builder.button.single-types.create',
      defaultMessage: 'Create new single type',
    },
    links: [
      {
        visible: true,
        name: 'application::homepage.homepage',
        title: 'Homepage',
        plugin: null,
        uid: 'application::homepage.homepage',
        to: '/plugins/content-type-builder/content-types/application::homepage.homepage',
        kind: 'singleType',
        restrictRelationsTo: null,
      },
    ],
  },
  {
    name: 'components',
    title: {
      id: 'content-type-builder.menu.section.components.name.',
      defaultMessage: 'Components',
    },
    customLink: {
      id: 'content-type-builder.button.component.create',
      defaultMessage: 'Create a new component',
    },
    links: [
      {
        name: 'basic',
        title: 'basic',
        isEditable: true,
        links: [
          {
            name: 'basic.simple',
            to: '/plugins/content-type-builder/component-categories/basic/basic.simple',
            title: 'simple',
          },
        ],
      },
      {
        name: 'default',
        title: 'default',
        isEditable: true,
        links: [
          {
            name: 'default.closingperiod',
            to: '/plugins/content-type-builder/component-categories/default/default.closingperiod',
            title: 'closingperiod',
          },
          {
            name: 'default.dish',
            to: '/plugins/content-type-builder/component-categories/default/default.dish',
            title: 'dish',
          },
        ],
      },
    ],
  },
];
