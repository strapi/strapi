'use strict';

module.exports = (fixtures) => {
  const category = (name) => {
    const categoryID = fixtures.category.find((cat) => cat.name === name)?.id;

    if (!categoryID) {
      throw new Error(`Invalid fixture category '${name}': not found`);
    }

    return categoryID;
  };

  return [
    {
      documentId: 'Article1',
      title: 'Article1-Draft-EN',
      publishedAt: null,
      password: '$2a$10$4EP.Y8crWYRpfk2rVmmoce8raDqGYVwMlcI//GDQdO6z06bO50igu',
      private: 'private',
      locale: 'en',
      categories: [category('Cat1-EN')],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article2',
      title: 'Article2-Draft-EN',
      publishedAt: null,
      password: null,
      private: 'private',
      locale: 'en',
      categories: [],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article1',
      title: 'Article1-Draft-NL',
      publishedAt: null,
      password: null,
      private: 'private',
      locale: 'nl',
      categories: [category('Cat1-NL')],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article1',
      title: 'Article1-Draft-IT',
      publishedAt: null,
      password: null,
      private: 'private',
      locale: 'it',
      categories: [category('Cat1-IT')],
      createdBy: 1,
      updatedBy: 1,
    },
    {
      documentId: 'Article2',
      title: 'Article2-Published-EN',
      publishedAt: '2019-01-01T00:00:00.000Z',
      password: null,
      private: 'private',
      locale: 'en',
      categories: [],
      createdBy: 1,
      updatedBy: 1,
    },
  ];
};
