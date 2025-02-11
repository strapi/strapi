import { File, FileCsv, FilePdf, FileXls, FileZip } from '@strapi/icons';
import { DocType } from '../constants';

export const FILE_TYPE_ICON_COMPONENT_MAP: Record<string, React.ComponentType> = {
  [DocType.Pdf]: FilePdf,
  [DocType.Csv]: FileCsv,
  [DocType.Xls]: FileXls,
  [DocType.Zip]: FileZip,
} as const;

export const DEFAULT_FILE_ICON: React.ComponentType = File;

export const getFileIconComponent = (docType?: string): React.ComponentType => {
  if (Object.values(DocType).some((type) => docType?.includes(type))) {
    return FILE_TYPE_ICON_COMPONENT_MAP[docType as DocType] ?? DEFAULT_FILE_ICON;
  }
  return DEFAULT_FILE_ICON;
};
