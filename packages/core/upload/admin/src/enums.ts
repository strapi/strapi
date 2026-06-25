export const DocType = {
  Pdf: 'pdf',
  Csv: 'csv',
  Xls: 'xls',
  Zip: 'zip',
} as const satisfies Record<Capitalize<DocType>, DocType>;

export type DocType = 'pdf' | 'csv' | 'xls' | 'zip';

export const AssetType = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Audio: 'audio',
} as const satisfies Record<string, AssetType>;

export type AssetType = 'video' | 'image' | 'doc' | 'audio';
