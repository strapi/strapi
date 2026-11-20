import type { Core } from '@strapi/strapi';

export default {
  beforeCreate(event) {
    // `data` is keyed by the article's attributes; values are what the caller passed.
    const { data } = event.params;

    if (typeof data?.title === 'string') {
      data.title = data.title.trim();
    }
  },
  afterCreate(event) {
    // The entry read back after the insert, typed from the article schema.
    strapi.log.debug(`Created article ${event.result.documentId}`);
  },
} satisfies Core.Lifecycles<'api::article.article'>;
