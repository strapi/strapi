import type { Core } from '@strapi/strapi';

/**
 * Give the public role read access (find + findOne) to the news content types,
 * so the web and mobile readers can fetch published content without a token.
 * Idempotent: only creates a permission if it does not already exist.
 */
async function setPublicPermissions(
  strapi: Core.Strapi,
  actionsByType: Record<string, string[]>
) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  for (const [type, actions] of Object.entries(actionsByType)) {
    for (const action of actions) {
      const actionId = `api::${type}.${type}.${action}`;
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: actionId, role: publicRole.id } });
      if (!existing) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action: actionId, role: publicRole.id },
        });
      }
    }
  }
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Seed a handful of demo categories, authors and published articles on the
 * very first boot (only when no articles exist yet). Real editors then use the
 * admin UI: write an article, hit Publish — that is the whole author flow.
 */
async function seedDemoContent(strapi: Core.Strapi) {
  const existing = await strapi.db.query('api::article.article').count();
  if (existing > 0) return;

  strapi.log.info('[seed] Empty database detected — seeding demo news content');

  const categories: Record<string, string> = {};
  for (const c of [
    { name: 'World', description: 'Global headlines and international affairs' },
    { name: 'Business', description: 'Markets, economy and companies' },
    { name: 'Technology', description: 'Tech, science and innovation' },
  ]) {
    const created = await strapi.documents('api::category.category').create({
      data: { name: c.name, slug: slugify(c.name), description: c.description },
    });
    categories[c.name] = created.documentId;
  }

  const authors: Record<string, string> = {};
  for (const a of [
    { name: 'Jane Doe', bio: 'Senior world affairs correspondent.' },
    { name: 'John Smith', bio: 'Business and markets reporter.' },
  ]) {
    const created = await strapi.documents('api::author.author').create({
      data: { name: a.name, bio: a.bio },
    });
    authors[a.name] = created.documentId;
  }

  const articles = [
    {
      title: 'Global leaders meet to discuss climate targets',
      excerpt:
        'Representatives from more than 40 nations gathered to set new emissions goals for the next decade.',
      category: 'World',
      author: 'Jane Doe',
      breaking: true,
      featured: true,
    },
    {
      title: 'Markets rally as inflation cools',
      excerpt:
        'Major indices posted their best week in months after fresh data showed price pressures easing.',
      category: 'Business',
      author: 'John Smith',
      featured: true,
    },
    {
      title: 'New chip promises to double on-device AI performance',
      excerpt:
        'The next generation of mobile processors focuses on running large models locally and privately.',
      category: 'Technology',
      author: 'John Smith',
    },
    {
      title: 'Elections underway across three continents this week',
      excerpt:
        'Voters head to the polls in a series of contests that could reshape regional alliances.',
      category: 'World',
      author: 'Jane Doe',
    },
    {
      title: 'Startups race to build the next big consumer app',
      excerpt:
        'Investors are pouring capital into a wave of founders chasing the next breakout product.',
      category: 'Business',
      author: 'John Smith',
    },
    {
      title: 'Researchers demonstrate faster, cheaper battery chemistry',
      excerpt:
        'A new approach could cut costs and extend range for the next generation of electric vehicles.',
      category: 'Technology',
      author: 'Jane Doe',
    },
  ];

  for (const a of articles) {
    await strapi.documents('api::article.article').create({
      data: {
        title: a.title,
        slug: slugify(a.title),
        excerpt: a.excerpt,
        content: `${a.excerpt}\n\nThis is placeholder body copy for the demo article "${a.title}". Replace it with real reporting from the Strapi admin, add a cover image, and press Publish.`,
        featured: a.featured ?? false,
        breaking: a.breaking ?? false,
        category: categories[a.category],
        author: authors[a.author],
      },
      status: 'published',
    });
  }

  strapi.log.info(
    `[seed] Created ${Object.keys(categories).length} categories, ${Object.keys(authors).length} authors, ${articles.length} articles`
  );
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi, {
      article: ['find', 'findOne'],
      category: ['find', 'findOne'],
      author: ['find', 'findOne'],
    });
    await seedDemoContent(strapi);
  },
};
