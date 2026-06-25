'use strict';

function getEntityIdentifier(entity) {
  if (!entity) return null;
  if (entity.documentId) return `${entity.documentId}::${entity.locale || ''}`;
  if (entity.id != null) return `id:${entity.id}`;
  return null;
}

function getEntityIdentifierArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(getEntityIdentifier).filter(Boolean);
}

function summarizeRelations(entry, relationFields) {
  const summary = {};
  for (const field of relationFields) {
    const value = entry[field];
    if (Array.isArray(value)) {
      summary[field] = getEntityIdentifierArray(value).sort();
    } else {
      summary[field] = getEntityIdentifier(value);
    }
  }
  return summary;
}

function areRelationSummariesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function describeRelationSummaryDiff(publishedSummary, draftSummary) {
  const keys = new Set([
    ...Object.keys(publishedSummary || {}),
    ...Object.keys(draftSummary || {}),
  ]);
  const parts = [];
  for (const k of keys) {
    const pj = JSON.stringify(publishedSummary?.[k]);
    const dj = JSON.stringify(draftSummary?.[k]);
    if (pj !== dj) {
      parts.push(`${k}: published=${pj} draft=${dj}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : 'summaries differ';
}

module.exports = {
  getEntityIdentifier,
  getEntityIdentifierArray,
  summarizeRelations,
  areRelationSummariesEqual,
  describeRelationSummaryDiff,
};
