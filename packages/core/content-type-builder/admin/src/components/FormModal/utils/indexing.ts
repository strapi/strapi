type SchemaIndex = {
  name?: string;
  type?: string;
  columns?: string[];
  attributes?: string[];
};

export const isAttributeIndexingFutureEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const strapiGlobal = (window as any).strapi;
  return strapiGlobal?.future?.isEnabled?.('unstableContentTypeBuilderIndexing') === true;
};

/** Whether the attribute has a non-unique index in the content type's indexes array. */
export const resolveIndexed = (
  indexes: SchemaIndex[] | undefined,
  attributeName: string
): boolean => {
  if (!Array.isArray(indexes)) return false;
  return indexes.some(
    (idx) =>
      (idx.type === 'index' || !idx.type) &&
      Array.isArray(idx.attributes) &&
      idx.attributes.length === 1 &&
      idx.attributes[0] === attributeName
  );
};

/**
 * Build next indexes array after setting "indexed" for one attribute.
 * Preserves legacy (columns-based) and multi-attribute indexes; replaces single-attribute index for this attribute.
 */
export const buildIndexesWithAttributeIndex = (
  indexes: SchemaIndex[] | undefined,
  oldAttributeName: string | undefined,
  newAttributeName: string,
  indexed: boolean
): SchemaIndex[] | undefined => {
  const current = Array.isArray(indexes) ? indexes : [];
  const managedNames = [newAttributeName, oldAttributeName].filter(Boolean) as string[];

  const preserved = current.filter((idx) => {
    if (Array.isArray(idx.columns) && idx.columns.length > 0) return true;
    if (!Array.isArray(idx.attributes) || idx.attributes.length !== 1) return true;
    return !managedNames.includes(idx.attributes[0]);
  });

  const next = indexed
    ? [...preserved, { type: 'index' as const, attributes: [newAttributeName] }]
    : preserved;
  return next.length > 0 ? next : undefined;
};

/** Strip index-related fields from attribute before saving; indexes live on the content type. */
export const stripAttributeIndexFields = (attribute: Record<string, unknown>) => {
  const cloned = { ...attribute };
  delete cloned.indexMode;
  delete cloned.indexed;
  return cloned;
};
