import { AssetType, DocType } from '../constants';

export const typeFromMime = (mime: string) => {
  if (mime.includes(AssetType.Image)) {
    return AssetType.Image;
  }
  if (mime.includes(AssetType.Video)) {
    return AssetType.Video;
  }
  if (mime.includes(AssetType.Audio)) {
    return AssetType.Audio;
  }
  if (mime.includes(DocType.Pdf)) {
    return DocType.Pdf;
  }
  if (mime.includes(DocType.Csv)) {
    return DocType.Csv;
  }
  // Xls file mimes are returned as application/vnd.ms-excel
  // So we need a specific condition here as the mime does not contain 'xls'
  if (mime.includes('excel')) {
    return DocType.Xls;
  }
  if (mime.includes(DocType.Zip)) {
    return DocType.Zip;
  }

  return AssetType.Document;
};
