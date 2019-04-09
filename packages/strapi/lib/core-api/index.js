const mongoose = require('./mongoose');
const bookshelf = require('./bookshelf');

// get defaultApi for a model
module.exports = connection => {
  switch (connection.connector) {
    case 'strapi-hook-bookshelf':
      return bookshelf;
    case 'strapi-hook-mongoose':
      return mongoose;
    default:
      throw new Error('Invalid connection');
  }
};
