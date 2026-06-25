import { AssetType, AssetTypes, DocType, DocTypes } from '../enums';

type MimeTypeMapKeys = Exclude<AssetType | DocType, 'xls' | 'doc'> | 'excel';

const MIME_TYPE_MAP: Record<MimeTypeMapKeys, AssetType | DocType> = {
  image: AssetTypes.Image,
  video: AssetTypes.Video,
  audio: AssetTypes.Audio,
  pdf: DocTypes.Pdf,
  csv: DocTypes.Csv,
  // For XLS files the mime is application/vnd.ms-excel so we need to check for 'excel' not 'xls'
  excel: DocTypes.Xls,
  zip: DocTypes.Zip,
};

const MIME_TYPE_KEYS = Object.keys(MIME_TYPE_MAP) as MimeTypeMapKeys[];

export const typeFromMime = (mime: string): AssetType | DocType => {
  const mimeTypeKey = MIME_TYPE_KEYS.find((m) => mime.toLowerCase().includes(m));

  if (mimeTypeKey === undefined) return AssetTypes.Document;

  return MIME_TYPE_MAP[mimeTypeKey] ?? AssetTypes.Document;
};
