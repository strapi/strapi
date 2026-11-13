/**
 * Schemas and populate shapes for the nested populate traversal tests.
 *
 * The schema is modelled on the LaunchPad demo app: pages and articles with dynamic zones of
 * components, relation cycles (article -> category -> article, category -> parent) that allow any
 * nesting depth, media, and a polymorphic `related` relation on upload files. On top of that it
 * has what the security checks act on: private attributes (flagged on the attribute and through
 * `options.privateAttributes`), a password, a private relation (`createdBy`), and a content type
 * the test auth cannot read (`api::secret.secret`).
 */
import type { Model } from '../types';

const ct = (uid: string, attributes: Record<string, any>, options: Record<string, any> = {}) =>
  ({
    uid,
    modelType: 'contentType',
    kind: 'collectionType',
    info: { displayName: uid, singularName: uid.split('.').pop() },
    options,
    attributes: {
      id: { type: 'integer' },
      documentId: { type: 'string' },
      ...attributes,
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        private: true,
        configurable: false,
        writable: false,
        visible: false,
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        private: true,
        configurable: false,
        writable: false,
        visible: false,
      },
    },
  }) as Model;

const component = (uid: string, attributes: Record<string, any>) =>
  ({
    uid,
    modelType: 'component',
    info: { displayName: uid },
    options: {},
    attributes: { id: { type: 'integer' }, ...attributes },
  }) as Model;

const relation = (target: string, relationType = 'manyToOne', extra: Record<string, any> = {}) => ({
  type: 'relation',
  relation: relationType,
  target,
  ...extra,
});

export const models: Record<string, Model> = {
  'api::page.page': ct('api::page.page', {
    title: { type: 'string' },
    slug: { type: 'uid' },
    secretNote: { type: 'string', private: true },
    seo: { type: 'component', component: 'shared.seo' },
    dynamic_zone: {
      type: 'dynamiczone',
      components: ['dz.hero', 'dz.related-articles', 'dz.features'],
    },
    articles: relation('api::article.article', 'manyToMany'),
    author: relation('api::author.author'),
    secrets: relation('api::secret.secret', 'oneToMany'),
    localizations: relation('api::page.page', 'oneToMany'),
    locale: { type: 'string' },
  }),
  'api::article.article': ct('api::article.article', {
    title: { type: 'string' },
    slug: { type: 'uid' },
    internalCode: { type: 'string', private: true },
    image: { type: 'media', multiple: false },
    seo: { type: 'component', component: 'shared.seo' },
    categories: relation('api::category.category', 'manyToMany'),
    author: relation('api::author.author'),
    related: relation('api::article.article', 'manyToMany'),
    secret: relation('api::secret.secret'),
    dynamic_zone: {
      type: 'dynamiczone',
      components: ['dz.related-articles', 'dz.cta'],
    },
  }),
  'api::category.category': ct('api::category.category', {
    name: { type: 'string' },
    weight: { type: 'integer' },
    internalScore: { type: 'integer', private: true },
    articles: relation('api::article.article', 'manyToMany'),
    parent: relation('api::category.category'),
    children: relation('api::category.category', 'oneToMany'),
  }),
  'api::author.author': ct(
    'api::author.author',
    {
      name: { type: 'string' },
      email: { type: 'email', private: true },
      password: { type: 'password' },
      internalRef: { type: 'string' },
      avatar: { type: 'media', multiple: false },
      profile: { type: 'component', component: 'shared.profile' },
      articles: relation('api::article.article', 'oneToMany'),
    },
    // Private through the schema options rather than the attribute flag.
    { privateAttributes: ['internalRef'] }
  ),
  'api::secret.secret': ct('api::secret.secret', {
    code: { type: 'string' },
    owner: relation('api::author.author'),
  }),
  'plugin::upload.file': ct('plugin::upload.file', {
    name: { type: 'string' },
    url: { type: 'string' },
    alternativeText: { type: 'string' },
    formats: { type: 'json' },
    folderPath: { type: 'string', private: true },
    folder: relation('plugin::upload.folder', 'manyToOne', { private: true }),
    related: { type: 'relation', relation: 'morphToMany', configurable: false },
  }),
  'plugin::upload.folder': ct('plugin::upload.folder', {
    name: { type: 'string' },
    path: { type: 'string' },
  }),
  'admin::user': ct('admin::user', {
    firstname: { type: 'string' },
    email: { type: 'email', private: true },
  }),
  'shared.seo': component('shared.seo', {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'text' },
    metaImage: { type: 'media', multiple: false },
    internalNotes: { type: 'text', private: true },
    keywords: { type: 'component', component: 'shared.keyword', repeatable: true },
  }),
  'shared.keyword': component('shared.keyword', { value: { type: 'string' } }),
  'shared.button': component('shared.button', {
    text: { type: 'string' },
    URL: { type: 'string' },
    link: { type: 'component', component: 'shared.link' },
  }),
  'shared.link': component('shared.link', {
    url: { type: 'string' },
    page: relation('api::page.page', 'oneToOne'),
    article: relation('api::article.article', 'oneToOne'),
  }),
  'shared.profile': component('shared.profile', {
    bio: { type: 'text' },
    secretToken: { type: 'string', private: true },
    picture: { type: 'media', multiple: false },
  }),
  'dz.hero': component('dz.hero', {
    heading: { type: 'string' },
    image: { type: 'media', multiple: false },
    CTAs: { type: 'component', component: 'shared.button', repeatable: true },
  }),
  'dz.related-articles': component('dz.related-articles', {
    heading: { type: 'string' },
    articles: relation('api::article.article', 'oneToMany'),
  }),
  'dz.features': component('dz.features', {
    heading: { type: 'string' },
    card: { type: 'component', component: 'dz.card' },
  }),
  'dz.card': component('dz.card', {
    title: { type: 'string' },
    hidden: { type: 'string', private: true },
    logos: { type: 'component', component: 'shared.button', repeatable: true },
  }),
  'dz.cta': component('dz.cta', {
    heading: { type: 'string' },
    CTAs: { type: 'component', component: 'shared.button', repeatable: true },
  }),
};

export const getModel = (uid: string) => models[uid];

/** UIDs the test auth may not read. */
export const RESTRICTED_UIDS = ['api::secret.secret', 'admin::user'];

/**
 * A `strapi` global that is just enough for the sanitizers: `auth.verify` denies the restricted
 * content types, and `contentTypes` lists every content type for polymorphic populate.
 */
export const createStrapiGlobal = () =>
  ({
    contentTypes: Object.fromEntries(
      Object.entries(models).filter(([, model]) => model.modelType === 'contentType')
    ),
    components: Object.fromEntries(
      Object.entries(models).filter(([, model]) => model.modelType === 'component')
    ),
    getModel,
    auth: {
      async verify(_auth: unknown, { scope }: { scope: string }) {
        if (RESTRICTED_UIDS.some((uid) => scope === `${uid}.find`)) {
          throw new Error('Forbidden');
        }
      },
    },
  }) as any;

type Shape = Record<string, unknown>;

/**
 * A relation chain `category -> articles -> categories -> articles ...` that is `depth` nested
 * `populate` keywords deep. Every level carries `fields`, `filters` and `sort`, and the chain
 * always ends on an article: `leaf` is the value of the last relation, so a case can put article
 * attributes at the bottom of the chain.
 */
export const chain = (
  depth: number,
  leaf: unknown = true,
  uid = 'api::category.category'
): Shape => {
  const isArticle = uid === 'api::article.article';

  const level: Shape = isArticle
    ? {
        fields: ['title', 'slug'],
        filters: { title: { $notNull: true } },
        sort: ['title:asc'],
      }
    : {
        fields: ['name', 'weight'],
        filters: { weight: { $gte: 1 } },
        sort: { weight: 'desc' },
      };

  if (depth <= 1) {
    return { ...level, populate: { [isArticle ? 'related' : 'articles']: leaf } };
  }

  return {
    ...level,
    populate: isArticle
      ? {
          image: true,
          seo: { populate: { metaImage: true } },
          categories: chain(depth - 1, leaf, 'api::category.category'),
        }
      : { parent: true, articles: chain(depth - 1, leaf, 'api::article.article') },
  };
};

/**
 * The path from the root populate `{ categories: chain(depth, leaf) }` to `leaf`, for example
 * `['categories', 'populate', 'articles', 'populate', 'related']` for depth 2.
 */
export const chainLeafPath = (depth: number): string[] => {
  const path = ['categories'];

  for (let remaining = depth, isArticle = false; remaining >= 1; remaining -= 1) {
    if (isArticle) {
      path.push('populate', remaining > 1 ? 'categories' : 'related');
    } else {
      path.push('populate', 'articles');
    }

    isArticle = !isArticle;
  }

  return path;
};

/**
 * A LaunchPad-like page populate: a dynamic zone with several `on` fragments, nested components,
 * media and relations, `depth` levels of nested `populate` below the related-articles fragment.
 */
export const pageShape = (depth: number): Shape => ({
  localizations: true,
  seo: { populate: { metaImage: true, keywords: true } },
  author: { fields: ['name'], populate: { avatar: true, profile: { populate: '*' } } },
  dynamic_zone: {
    on: {
      'dz.hero': {
        populate: {
          image: true,
          CTAs: { populate: { link: { populate: { page: true, article: true } } } },
        },
      },
      'dz.features': {
        populate: { card: { populate: { logos: { populate: { link: true } } } } },
      },
      'dz.related-articles': {
        populate: { articles: chain(depth, true, 'api::article.article') },
      },
    },
  },
});

/**
 * The populate corpus. Each case is a populate value applied to the root schema named by `uid`.
 * The cases cover every form a populate value can take (objects, `true`, string booleans, `*`,
 * dot-notation strings, string arrays, `on` fragments, `count`), every query keyword inside a
 * nested populate (`fields`, `filters`, `sort`), and the cases the security checks act on
 * (private and password attributes, restricted relations, invalid keys), from depth 1 to 6.
 */
export const corpus = (): Array<{ name: string; uid: string; populate: unknown }> => {
  const cases: Array<{ name: string; uid: string; populate: unknown }> = [];
  const add = (name: string, populate: unknown, uid = 'api::article.article') =>
    cases.push({ name, uid, populate });

  // Top-level forms
  add('wildcard', '*');
  add('string', 'image');
  add('comma string', 'image,categories');
  add('dot string', 'categories.articles.image');
  add('string array', ['image', 'categories.articles', 'author.avatar']);
  add('boolean object', { image: true, categories: true, author: 'true', seo: false });
  add('count', { categories: { count: true }, related: { count: 'true' } });

  for (let depth = 1; depth <= 6; depth += 1) {
    add(`chain depth ${depth}`, { categories: chain(depth) });
    add(`chain depth ${depth} ending in a wildcard`, { categories: chain(depth, '*') });
    add(`chain depth ${depth} ending in a nested wildcard populate`, {
      categories: chain(depth, { populate: '*' }),
    });
    add(`chain depth ${depth} ending in a dot string`, {
      categories: chain(depth, { populate: 'categories.articles.image' }),
    });
    add(`chain depth ${depth} ending in a string array`, {
      categories: chain(depth, { populate: ['categories', 'author.avatar', 'related.image'] }),
    });
    add(`page depth ${depth}`, pageShape(depth), 'api::page.page');
  }

  for (const depth of [2, 4, 6]) {
    const atBottom = (bottom: unknown) => ({ categories: chain(depth, bottom) });

    // Private, password and restricted attributes at the bottom of the chain
    add(
      `depth ${depth}: private relation`,
      atBottom({ populate: { createdBy: true, image: { populate: { folder: true } } } })
    );
    add(
      `depth ${depth}: restricted relation`,
      atBottom({ populate: { secret: { populate: { owner: true } }, author: true } })
    );
    add(
      `depth ${depth}: private fields`,
      atBottom({ fields: ['title', 'internalCode', 'documentId'] })
    );
    add(
      `depth ${depth}: private filters`,
      atBottom({
        filters: {
          author: { email: { $eq: 'a@b.c' }, internalRef: { $eq: 'x' }, name: { $eq: 'n' } },
          internalCode: { $eq: 'x' },
          title: { $eq: 't' },
        },
      })
    );
    add(
      `depth ${depth}: password filters and sort`,
      atBottom({
        filters: { author: { password: { $startsWith: 'a' } } },
        sort: { author: { password: 'asc' }, title: 'asc' },
      })
    );
    add(`depth ${depth}: private sort`, atBottom({ sort: ['internalCode:asc', 'title:desc'] }));
    add(`depth ${depth}: invalid populate key`, atBottom({ populate: { notAnAttribute: true } }));
    add(`depth ${depth}: scalar populate key`, atBottom({ populate: { title: true } }));
    add(
      `depth ${depth}: invalid nested dot string`,
      atBottom({ populate: 'author.notAnAttribute' })
    );
    add(`depth ${depth}: media dot string`, atBottom({ populate: 'image.related' }));
    add(`depth ${depth}: dynamic zone dot string`, atBottom({ populate: 'dynamic_zone.heading' }));
    add(
      `depth ${depth}: invalid filter key`,
      atBottom({ filters: { notAnAttribute: { $eq: 1 } } })
    );
    add(`depth ${depth}: invalid sort key`, atBottom({ sort: { notAnAttribute: 'asc' } }));
    add(`depth ${depth}: invalid fields key`, atBottom({ fields: ['notAnAttribute'] }));
    add(`depth ${depth}: root-only key`, atBottom({ status: 'draft' }));
    add(
      `depth ${depth}: dynamic zone fragments`,
      atBottom({
        populate: {
          dynamic_zone: {
            on: {
              'dz.related-articles': {
                fields: ['heading'],
                populate: {
                  articles: {
                    fields: ['title', 'internalCode'],
                    populate: { createdBy: true, secret: true, author: true },
                  },
                },
              },
              'dz.cta': { populate: { CTAs: { populate: { link: { populate: '*' } } } } },
            },
          },
        },
      })
    );
    add(
      `depth ${depth}: dynamic zone wildcard`,
      atBottom({ populate: { dynamic_zone: { populate: '*' } } })
    );
    add(
      `depth ${depth}: dynamic zone nested populate`,
      atBottom({ populate: { dynamic_zone: { populate: { articles: true } } } })
    );
    add(
      `depth ${depth}: invalid fragment target`,
      atBottom({ populate: { dynamic_zone: { on: { 'dz.unknown': true } } } })
    );
    add(
      `depth ${depth}: polymorphic fragments`,
      atBottom({
        populate: {
          image: {
            populate: {
              related: {
                on: {
                  'api::article.article': { fields: ['title', 'internalCode'] },
                  'api::secret.secret': { fields: ['code'] },
                },
              },
            },
          },
        },
      })
    );
    add(
      `depth ${depth}: polymorphic wildcard`,
      atBottom({ populate: { image: { populate: { related: true } } } })
    );
    add(
      `depth ${depth}: private attributes in a wildcard`,
      atBottom({ populate: { author: { populate: '*' }, seo: { populate: '*' } } })
    );
    add(
      `depth ${depth}: components`,
      atBottom({
        populate: {
          seo: {
            fields: ['metaTitle', 'internalNotes'],
            populate: { metaImage: { fields: ['url', 'folderPath'] }, keywords: true },
          },
        },
      })
    );
    add(
      `depth ${depth}: filters that empty out`,
      atBottom({
        filters: {
          author: { name: { $notAnOperator: 'x' } },
          $and: [{ title: { $notAnOperator: 1 } }],
        },
      })
    );
    add(`depth ${depth}: count`, atBottom({ count: true }));
  }

  return cases;
};
