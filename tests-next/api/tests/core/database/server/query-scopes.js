'use strict';

const AUTHOR_UID = 'api::qs-author.qs-author';
const ARTICLE_UID = 'api::qs-article.qs-article';
const POST_UID = 'api::qs-post.qs-post';
const SEO_UID = 'default.qsseo';

/** Unregister functions of the scopes and lifecycles this script added, by name. */
const registered = new Map();

const unregister = (name) => {
  registered.get(name)?.();
  registered.delete(name);
};

// `deleted_at` is not an attribute key, so the scope filters the raw column with no join
const softDelete = {
  where: ({ uid }) => (uid === AUTHOR_UID || uid === ARTICLE_UID ? { deleted_at: null } : null),
};

const assertWritable = async (strapi, where) => {
  const writable = await strapi.db
    .query(POST_UID)
    .count({ where: { $and: [where, { team: 'own' }] } });

  if (writable === 0) {
    throw new Error('The post is not writable');
  }
};

const joinTable = (strapi, uid, name) => {
  const attribute = strapi.db.metadata.get(uid).attributes[name];
  return 'joinTable' in attribute && attribute.joinTable ? attribute.joinTable.name : name;
};

const table = (strapi, uid) => strapi.db.connection(strapi.db.metadata.get(uid).tableName);

module.exports = {
  actions: {
    // Seed first: the scope also hides the rows that a create reads back
    registerSoftDelete({ strapi }) {
      unregister('softDelete');
      registered.set('softDelete', strapi.db.unstable_scopes.register(softDelete));
    },

    // Reads past the scope, to prove a hidden row is still there and unchanged
    async rawArticle({ strapi }, { title }) {
      return (await table(strapi, ARTICLE_UID).where({ title }).first()) ?? null;
    },

    async rawAuthor({ strapi }, { name }) {
      return (await table(strapi, AUTHOR_UID).where({ name }).first()) ?? null;
    },

    // The join reads the author with type select, so a scope on update does not hide D there
    async relationFilterInWriteWithUpdateScope({ strapi }) {
      const unregisterD = strapi.db.unstable_scopes.register({
        where: ({ uid, type }) =>
          uid === AUTHOR_UID && type === 'update' ? { name: { $ne: 'D' } } : null,
      });

      try {
        // Positive control: the scope hides D from an update of the author table
        const authors = await strapi.db
          .query(AUTHOR_UID)
          .updateMany({ where: { name: 'D' }, data: { name: 'D' } });
        const articles = await strapi.db
          .query(ARTICLE_UID)
          .updateMany({ where: { author: { name: 'D' } }, data: { views: 4 } });

        return { authors, articles };
      } finally {
        unregisterD();
      }
    },

    // Reads see own and shared posts, writes change only own posts
    installOwnerGuard({ strapi }) {
      unregister('team');
      unregister('guard');
      registered.set(
        'team',
        strapi.db.unstable_scopes.register({
          where({ uid, type }) {
            if (uid !== POST_UID) {
              return null;
            }

            return type === 'select' || type === 'count'
              ? { team: { $in: ['own', 'shared'] } }
              : { team: 'own' };
          },
        })
      );
      registered.set(
        'guard',
        strapi.db.lifecycles.subscribe({
          models: [POST_UID],
          async beforeUpdate(event) {
            await assertWritable(strapi, event.params.where);
          },
          async beforeDelete(event) {
            await assertWritable(strapi, event.params.where);
          },
        })
      );
    },

    removeOwnerGuard() {
      unregister('guard');
      unregister('team');
    },

    // Reads past the scope: the post rows, the author links, the component links and rows
    rawPostTables({ strapi }) {
      return Promise.all(
        [
          strapi.db.metadata.get(POST_UID).tableName,
          joinTable(strapi, POST_UID, 'author'),
          joinTable(strapi, POST_UID, 'seo'),
          strapi.db.metadata.get(SEO_UID).tableName,
        ].map((name) => strapi.db.connection(name).orderBy('id'))
      );
    },
  },
};
