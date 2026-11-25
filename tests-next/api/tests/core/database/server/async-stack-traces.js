'use strict';

const ARTICLE_UID = 'api::stack-article.stack-article';

let middlewareInstalled = false;
let saturateOnFindMany = false;
let captured;

/** Takes every free connection so the next acquire has to wait for the timeout. */
const saturatePool = async (strapi) => {
  const { client } = strapi.db.connection;
  const free = client.pool.max - client.pool.numUsed();
  const held = await Promise.all(Array.from({ length: free }, () => client.acquireConnection()));

  return async () => {
    await Promise.all(held.map((connection) => client.releaseConnection(connection)));
  };
};

async function queryFromTestCode(strapi) {
  const result = await strapi.db.query('strapi::core-store').findMany({ limit: 1 });
  return result;
}

const stackOf = (error) => (error ? { name: error.name, stack: error.stack } : null);

module.exports = {
  actions: {
    acquireConnectionTimeout({ strapi }) {
      return strapi.db.connection.client.config.acquireConnectionTimeout;
    },

    /**
     * Registered after load, as the old test did, so it runs last, right before the document
     * service starts its transaction.
     */
    installMiddleware({ strapi }) {
      if (middlewareInstalled) {
        return;
      }
      middlewareInstalled = true;
      strapi.documents.use(async (ctx, next) => {
        if (!saturateOnFindMany || ctx.uid !== ARTICLE_UID || ctx.action !== 'findMany') {
          return next();
        }

        const release = await saturatePool(strapi);
        try {
          // Awaited here, so the catch sees the error
          // eslint-disable-next-line @typescript-eslint/return-await
          return await next();
        } catch (error) {
          captured = error;
          throw error;
        } finally {
          await release();
        }
      });
    },

    saturateOnFindMany(_, { enabled }) {
      saturateOnFindMany = enabled;
      if (enabled) {
        captured = undefined;
      }
    },

    captured() {
      return stackOf(captured);
    },

    async directQueryTimeout({ strapi }) {
      const release = await saturatePool(strapi);

      try {
        const error = await queryFromTestCode(strapi).catch((e) => e);
        return stackOf(error);
      } finally {
        await release();
      }
    },
  },
};
