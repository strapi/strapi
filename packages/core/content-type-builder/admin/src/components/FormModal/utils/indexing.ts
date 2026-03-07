type IndexType = 'index' | 'unique';
type IndexScope = 'global' | 'variant';

export type IndexMode = 'none' | 'index' | 'unique-global' | 'unique-variant';

export const isAttributeIndexingFutureEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const strapiGlobal = (window as any).strapi;
  return strapiGlobal?.future?.isEnabled?.('unstableContentTypeBuilderIndexing') === true;
};

type ModelIndex = {
  name?: string;
  type?: string;
  columns?: string[];
  attributes?: string[];
  scope?: string;
};

const isSingleAttributeIndexFor = (index: ModelIndex, attributeName: string) => {
  return (
    Array.isArray(index.attributes) &&
    index.attributes.length === 1 &&
    index.attributes[0] === attributeName
  );
};

const isLegacyColumnsIndex = (index: ModelIndex) => {
  return Array.isArray(index.columns) && index.columns.length > 0;
};

const createIndexFromMode = (attributeName: string, mode: IndexMode): ModelIndex | null => {
  if (mode === 'none') {
    return null;
  }

  if (mode === 'index') {
    return {
      type: 'index',
      attributes: [attributeName],
    };
  }

  if (mode === 'unique-variant') {
    return {
      type: 'unique',
      scope: 'variant',
      attributes: [attributeName],
    };
  }

  return {
    type: 'unique',
    scope: 'global',
    attributes: [attributeName],
  };
};

const isSingleAttributeManagedIndex = (index: ModelIndex) => {
  return (
    !isLegacyColumnsIndex(index) && Array.isArray(index.attributes) && index.attributes.length === 1
  );
};

const getManagedIndexSignature = (index: ModelIndex) => {
  if (!isSingleAttributeManagedIndex(index)) {
    return null;
  }

  const attribute = index.attributes?.[0];
  const type = index.type ?? 'index';
  const scope = index.scope ?? 'global';

  return `${attribute}::${type}::${scope}`;
};

const dedupeManagedIndexes = (indexes: ModelIndex[]) => {
  const seen = new Set<string>();

  return indexes.filter((index) => {
    const signature = getManagedIndexSignature(index);

    if (!signature) {
      return true;
    }

    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

export const resolveIndexMode = ({
  indexes,
  attributeName,
  legacyUnique: _legacyUnique,
}: {
  indexes?: ModelIndex[];
  attributeName: string;
  legacyUnique?: boolean;
}): IndexMode => {
  if (Array.isArray(indexes)) {
    const index = indexes.find((entry) => isSingleAttributeIndexFor(entry, attributeName));

    if (index?.type === 'index') {
      return 'index';
    }

    if (index?.type === 'unique') {
      return index.scope === 'variant' ? 'unique-variant' : 'unique-global';
    }
  }

  // Legacy attribute.unique stays business-logic-only and must not imply a DB index mode.
  return 'none';
};

export const buildNextIndexes = ({
  indexes,
  oldAttributeName,
  newAttributeName,
  mode,
}: {
  indexes?: ModelIndex[];
  oldAttributeName?: string;
  newAttributeName: string;
  mode: IndexMode;
}): ModelIndex[] | undefined => {
  const current = Array.isArray(indexes) ? indexes : [];
  const managedNames = new Set([newAttributeName, oldAttributeName].filter(Boolean) as string[]);

  const preserved = current.filter((entry) => {
    if (isLegacyColumnsIndex(entry)) {
      return true;
    }

    if (!Array.isArray(entry.attributes) || entry.attributes.length !== 1) {
      return true;
    }

    return !managedNames.has(entry.attributes[0]);
  });

  const maybeNewIndex = createIndexFromMode(newAttributeName, mode);
  const next = maybeNewIndex ? [...preserved, maybeNewIndex] : preserved;
  const deduped = dedupeManagedIndexes(next);

  return deduped.length > 0 ? deduped : undefined;
};

export const removeManagedIndexesForAttribute = ({
  indexes,
  attributeName,
}: {
  indexes?: ModelIndex[];
  attributeName: string;
}): ModelIndex[] | undefined => {
  if (!Array.isArray(indexes)) {
    return undefined;
  }

  const next = indexes.filter((entry) => {
    if (isLegacyColumnsIndex(entry)) {
      return true;
    }

    if (!Array.isArray(entry.attributes) || entry.attributes.length !== 1) {
      return true;
    }

    return entry.attributes[0] !== attributeName;
  });

  return next.length > 0 ? next : undefined;
};

export const stripAttributeIndexFields = (attribute: Record<string, unknown>) => {
  const cloned = { ...attribute };
  delete cloned.indexMode;
  return cloned;
};
