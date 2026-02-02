import { AssetType, DocType } from '../enums';

const MIME_TYPE_MAP: Record<string, AssetType | DocType> = {
  image: AssetType.Image,
  video: AssetType.Video,
  audio: AssetType.Audio,
  pdf: DocType.Pdf,
  csv: DocType.Csv,
  // For XLS files the mime is application/vnd.ms-excel so we need to check for 'excel' not 'xls'
  excel: DocType.Xls,
  zip: DocType.Zip,
};

const MIME_TYPE_KEYS = Object.keys(MIME_TYPE_MAP) as Array<keyof typeof MIME_TYPE_MAP>;

export const typeFromMime = (mime: string): AssetType | DocType => {
  const mimeTypeKey = MIME_TYPE_KEYS.find((m) => mime.toLowerCase().includes(m));

  if (mimeTypeKey === undefined) return AssetType.Document;

  return MIME_TYPE_MAP[mimeTypeKey] ?? AssetType.Document;
};
