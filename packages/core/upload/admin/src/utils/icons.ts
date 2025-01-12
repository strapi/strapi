import { File, FileCsv, FilePdf, FileXls, FileZip } from '@strapi/icons';
import { FileType } from '../constants';

export const FILE_TYPE_ICON_COMPONENT_MAP = {
  [FileType.Pdf]: FilePdf,
  [FileType.Csv]: FileCsv,
  [FileType.Xls]: FileXls,
  [FileType.Zip]: FileZip,
} as const;

export const DEFAULT_FILE_ICON = File;

export const getFileIconComponent = (fileType?: string) => {
  // If we have an icon for the given file type, return it
  if (Object.values(FileType).some((type) => fileType?.includes(type))) {
    return FILE_TYPE_ICON_COMPONENT_MAP[fileType as FileType] ?? DEFAULT_FILE_ICON;
  }
  return DEFAULT_FILE_ICON;
};
