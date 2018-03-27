'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const { graphqlKoa, graphiqlKoa } = require('apollo-server-koa');
const { makeExecutableSchema } = require('graphql-tools');

const books = [
  {
    title: "Harry Potter and the Sorcerer's stone",
    author: 'J.K. Rowling',
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
];

// The GraphQL schema in string form
const typeDefs = `
  type Query { books: [Book] }
  type Book { title: String, author: String }
`;

// The resolvers
const resolvers = {
  Query: { books: () => books },
};

// Put together a schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = strapi => {
  return {
    beforeInitialize: function() {
      // Try to inject this middleware just after the parser to skip the router processing.
      const index = strapi.config.middleware.load.after.indexOf('parser');

      if (index !== -1) {
        strapi.config.middleware.load.after.splice(index + 1, 0, 'graphql');
      } else {
        strapi.config.middleware.load.after.push('graphql');
      }
    },

    initialize: function(cb) {
      const endpoint = '/graphql';
      const router = strapi.koaMiddlewares.routerJoi();

      router.post(endpoint, graphqlKoa({ schema }));
      router.get(endpoint, graphqlKoa({ schema }));

      router.get('/graphiql', graphiqlKoa({ endpointURL: endpoint }));

      strapi.app.use(router.middleware());

      cb();
    }
  };
};
