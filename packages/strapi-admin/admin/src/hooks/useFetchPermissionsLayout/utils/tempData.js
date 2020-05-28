const data = {
  sections: {
    contentTypes: [
      {
        name: 'Create',
        action: 'plugins::content-type.create', // same with read, update and delete
        subjects: ['plugins::users-permissions.user'], // on which content type it will be applied
      },
    ],
    plugins: [
      {
        name: 'Read', // Label checkbox
        plugin: 'plugin::content-type-builder', // Retrieve banner info
        subCategory: 'Category name', // if null, then the front uses plugin's name by default
        action: 'plugins::content-type-builder.read', // Mapping
      },
    ],
    settings: [
      {
        name: 'Create', // Label checkbox
        category: 'Webhook', // Banner info
        subCategory: 'category name', // Divider title
        action: 'plugins::content-type-builder.create',
      },
    ],
  },
};

export default data;
