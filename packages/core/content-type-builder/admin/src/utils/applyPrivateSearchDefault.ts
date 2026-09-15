const SEARCHABLE_ATTRIBUTE_TYPES = new Set([
  'string',
  'text',
  'uid',
  'email',
  'enumeration',
  'richtext',
  'biginteger',
  'integer',
  'decimal',
  'float',
]);

type Attribute = {
  type?: unknown;
  private?: unknown;
  searchable?: unknown;
};

// Mirrors the scalar types used by database search without importing server code into the admin.
export const applyPrivateSearchDefault = <T extends Attribute>(attribute: T): T => {
  if (
    attribute.private === true &&
    attribute.searchable === undefined &&
    typeof attribute.type === 'string' &&
    SEARCHABLE_ATTRIBUTE_TYPES.has(attribute.type)
  ) {
    return { ...attribute, searchable: false };
  }

  return attribute;
};
