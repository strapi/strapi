export const DOC_TYPES = {
  Pdf: 'pdf',
  Csv: 'csv',
  Xls: 'xls',
  Zip: 'zip',
} as const;

export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];

export const ASSET_TYPES = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Audio: 'audio',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];
