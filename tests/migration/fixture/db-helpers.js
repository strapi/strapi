'use strict';

function parseCountResult(countResult) {
  if (!countResult) return 0;
  if (typeof countResult === 'number') return countResult;
  if (countResult.count !== undefined) return Number(countResult.count) || 0;
  if (countResult['count(*)'] !== undefined) return Number(countResult['count(*)']) || 0;
  const first = Object.values(countResult)[0];
  return Number(first) || 0;
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 */
async function countFor(strapi, uid) {
  const res = await strapi.db.query(uid).count();
  return parseCountResult(res[0] || res);
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 */
async function countPublishedDrafts(strapi, uid) {
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

function buildPopulateFromAttributes(attributes) {
  const populate = {};
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

function isI18nContentType(contentType) {
  return Boolean(contentType?.pluginOptions?.i18n?.localized);
}

module.exports = {
  parseCountResult,
  countFor,
  countPublishedDrafts,
  buildPopulateFromAttributes,
  isI18nContentType,
};
