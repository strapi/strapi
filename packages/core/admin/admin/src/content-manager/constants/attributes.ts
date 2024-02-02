const CREATOR_FIELDS = ['createdBy', 'updatedBy'];

const DOCUMENT_META_FIELDS = [
  ...CREATOR_FIELDS,
  'publishedBy',
  'createdAt',
  'updatedAt',
  'publishedAt',
];

export { CREATOR_FIELDS, DOCUMENT_META_FIELDS };
