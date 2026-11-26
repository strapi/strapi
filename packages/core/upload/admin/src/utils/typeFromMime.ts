import { AssetType, ASSET_TYPES, DocType, DOC_TYPES } from '../enums';

type MimeTypeMapKeys = Exclude<AssetType | DocType, 'xls' | 'doc'> | 'excel';

const MIME_TYPE_MAP: Record<MimeTypeMapKeys, AssetType | DocType> = {
  image: ASSET_TYPES.Image,
  video: ASSET_TYPES.Video,
  audio: ASSET_TYPES.Audio,
  pdf: DOC_TYPES.Pdf,
  csv: DOC_TYPES.Csv,
  // For XLS files the mime is application/vnd.ms-excel so we need to check for 'excel' not 'xls'
  excel: DOC_TYPES.Xls,
  zip: DOC_TYPES.Zip,
};

const MIME_TYPE_KEYS = Object.keys(MIME_TYPE_MAP) as MimeTypeMapKeys[];

export const typeFromMime = (mime: string): AssetType | DocType => {
  const mimeTypeKey = MIME_TYPE_KEYS.find((m) => mime.toLowerCase().includes(m));

  if (mimeTypeKey === undefined) return ASSET_TYPES.Document;

  return MIME_TYPE_MAP[mimeTypeKey] ?? ASSET_TYPES.Document;
};
