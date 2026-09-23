type EntityLike = {
  documentId?: string;
  locale?: string;
  id?: string | number;
  [key: string]: unknown;
} | null;

function getEntityIdentifier(entity: EntityLike): string | null {
  if (!entity) return null;
  if (entity.documentId) return `${entity.documentId}::${entity.locale || ''}`;
  if (entity.id != null) return `id:${entity.id}`;
  return null;
}

function getEntityIdentifierArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(getEntityIdentifier).filter(Boolean) as string[];
}

type RelationSummary = Record<string, string | string[] | null>;

function summarizeRelations(
  entry: Record<string, unknown>,
  relationFields: string[]
): RelationSummary {
  const summary: RelationSummary = {};
  for (const field of relationFields) {
    const value = entry[field];
    if (Array.isArray(value)) {
      summary[field] = getEntityIdentifierArray(value).sort();
    } else {
      summary[field] = getEntityIdentifier(value as EntityLike);
    }
  }
  return summary;
}

function areRelationSummariesEqual(a: RelationSummary, b: RelationSummary): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function describeRelationSummaryDiff(
  publishedSummary: RelationSummary | null | undefined,
  draftSummary: RelationSummary | null | undefined
): string {
  const keys = new Set([
    ...Object.keys(publishedSummary || {}),
    ...Object.keys(draftSummary || {}),
  ]);
  const parts: string[] = [];
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
