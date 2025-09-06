import { AssetType, DocType } from '../enums';

const MIME_TYPE_MAP: Record<string, string> = {
  image: AssetType.Image,
  video: AssetType.Video,
  audio: AssetType.Audio,
  pdf: DocType.Pdf,
  csv: DocType.Csv,
  // For XLS files the mime is application/vnd.ms-excel so we need to check for 'excel' not 'xls'
  excel: DocType.Xls,
  zip: DocType.Zip,
};

export const typeFromMime = (mime: string) => {
  const lowerCasedMime = mime.toLowerCase();

  for (const [key, value] of Object.entries(MIME_TYPE_MAP)) {
    if (lowerCasedMime.includes(key)) {
      return value;
    }
  }

  return AssetType.Document;
};
