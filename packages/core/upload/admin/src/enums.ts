export const DocTypes = {
  Pdf: 'pdf',
  Csv: 'csv',
  Xls: 'xls',
  Zip: 'zip',
} as const;

export type DocType = (typeof DocTypes)[keyof typeof DocTypes];

export const AssetTypes = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Audio: 'audio',
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];
