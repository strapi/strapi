'use strict';

/**
 * Lifecycle callbacks for the `Restaurant` model.
 */

module.exports = {
  // Before saving a value.
  // Fired before an `insert` or `update` query.
  // beforeSave: async (model, attrs, options) => {},
  // After saving a value.
  // Fired after an `insert` or `update` query.
  // afterSave: async (model, response, options) => {},
  // Before fetching a value.
  // Fired before a `fetch` operation.
  beforeFetch: async (...args) => {
    console.log('beforeFetch', ...args);
  },
  // After fetching a value.
  // Fired after a `fetch` operation.
  afterFetch: async (...args) => {
    console.log('afterFetch', ...args);
  },
  // Before fetching all values.
  // Fired before a `fetchAll` operation.
  beforeFetchAll: async (...args) => {
    console.log('beforeFetchAll', ...args);
  },
  // After fetching all values.
  // Fired after a `fetchAll` operation.
  afterFetchAll: async (...args) => {
    console.log('afterFetchAll', ...args);
  },
  // Before creating a value.
  // Fired before an `insert` query.
  beforeCreate: async (...args) => {
    console.log('beforeCreate', ...args);
    args[0].name += ' - Coucou';
  },
  // After creating a value.
  // Fired after an `insert` query.
  afterCreate: async (...args) => {
    console.log('afterCreate', ...args);
  },
  // Before updating a value.
  // Fired before an `update` query.
  beforeUpdate: async (...args) => {
    console.log('beforeUpdate', ...args);
    args[1].name += ' - Coucou';
  },
  // After updating a value.
  // Fired after an `update` query.
  afterUpdate: async (...args) => {
    console.log('afterUpdate', ...args);
  },
  // Before destroying a value.
  // Fired before a `delete` query.
  beforeDestroy: async (...args) => {
    console.log('beforeDestroy', ...args);
  },
  // After destroying a value.
  // Fired after a `delete` query.
  afterDestroy: async (...args) => {
    console.log('afterDestroy', ...args);
  },
};
