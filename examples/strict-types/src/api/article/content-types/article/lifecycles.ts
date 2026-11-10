import type { Core } from '@strapi/strapi';

/** The lifecycles of a content type: the subscriber `strapi.db.lifecycles.subscribe` accepts. */
type Lifecycles = Parameters<Core.Strapi['db']['lifecycles']['subscribe']>[0];

export default {
  beforeCreate(event) {
    const { data } = event.params;

    if (typeof data?.title === 'string') {
      data.title = data.title.trim();
    }
  },
} satisfies Lifecycles;
