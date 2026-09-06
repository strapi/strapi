type Strapi = import('@strapi/types').Core.Strapi;

type CountResult = number | Record<string, unknown> | null | undefined;

function parseCountResult(countResult: CountResult): number {
  if (!countResult) return 0;
  if (typeof countResult === 'number') return countResult;
  if (countResult.count !== undefined) return Number(countResult.count) || 0;
  if (countResult['count(*)'] !== undefined) return Number(countResult['count(*)']) || 0;
  const first = Object.values(countResult)[0];
  return Number(first) || 0;
}

async function countFor(strapi: Strapi, uid: string): Promise<number> {
  const res = await strapi.db.query(uid).count();
  return parseCountResult(res[0] || res);
}

async function countPublishedDrafts(
  strapi: Strapi,
  uid: string
): Promise<{ published: number; drafts: number }> {
  const publishedRes = await strapi.db.query(uid).count({
    where: { publishedAt: { $notNull: true } },
  });
  const draftRes = await strapi.db.query(uid).count({
    where: { publishedAt: { $null: true } },
  });

  return {
    published: parseCountResult(publishedRes[0] || publishedRes),
    drafts: parseCountResult(draftRes[0] || draftRes),
  };
}

type AttributeLike = {
  type?: string;
  [key: string]: unknown;
};

function buildPopulateFromAttributes(
  attributes: Record<string, AttributeLike> | null | undefined
): Record<string, true | { populate: '*' }> | undefined {
  const populate: Record<string, true | { populate: '*' }> = {};
  for (const [name, attr] of Object.entries(attributes || {})) {
    if (!attr) continue;
    if (attr.type === 'relation' || attr.type === 'media') {
      populate[name] = true;
    } else if (attr.type === 'component' || attr.type === 'dynamiczone') {
      populate[name] = { populate: '*' };
    }
  }
  return Object.keys(populate).length > 0 ? populate : undefined;
}

type ContentTypeLike = {
  pluginOptions?: { i18n?: { localized?: boolean } };
  [key: string]: unknown;
};

function isI18nContentType(contentType: ContentTypeLike | null | undefined): boolean {
  return Boolean(contentType?.pluginOptions?.i18n?.localized);
}

module.exports = {
  parseCountResult,
  countFor,
  countPublishedDrafts,
  buildPopulateFromAttributes,
  isI18nContentType,
};
