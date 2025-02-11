import { AssetType, DocType } from '../constants';

const MIME_TYPE_MAP: Record<string, string> = {
  image: AssetType.Image,
  video: AssetType.Video,
  audio: AssetType.Audio,
  pdf: DocType.Pdf,
  csv: DocType.Csv,
  excel: DocType.Xls,
  zip: DocType.Zip,
};

export const typeFromMime = (mime: string) => {
  const lowerCasedMime = mime.toLowerCase();

  for (const [key, value] of Object.entries(MIME_TYPE_MAP)) {
    if (lowerCasedMime.includes(key)) {
      return value;
    }

    // XLS files are an edge case as the mime is application/vnd.ms-excel
    if (key === 'excel' && lowerCasedMime.includes('excel')) {
      return value;
    }
  }

  return AssetType.Document;
};
