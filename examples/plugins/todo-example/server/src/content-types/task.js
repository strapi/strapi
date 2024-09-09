module.exports = {
  info: {
    tableName: 'task',
    singularName: 'task', // kebab-case mandatory
    pluralName: 'tasks', // kebab-case mandatory
    displayName: 'Task',
    description: 'A task in Strapi',
    kind: 'collectionType',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    name: {
      type: 'string',
      required: true,
      maxLength: 40,
    },
    isDone: {
      type: 'boolean',
      default: false,
    },
    related: {
      type: 'relation',
      relation: 'morphToOne',
    },
  },
};
