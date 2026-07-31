import { SVGProps } from 'react';

import { File, FileCsv, FilePdf, FileXls, FileZip } from '@strapi/icons';
import { DefaultTheme } from 'styled-components';

import { DocType, DOC_TYPES } from '../enums';

// The IconProps interface is not exported from our design library package, so we need to redefine it here
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> {
  /**
   * @default "currentColor"
   */
  fill?: keyof DefaultTheme['colors'] | string;
  stroke?: keyof DefaultTheme['colors'] | string;
}

type IconComponent = React.FC<IconProps>;

export const FILE_TYPE_ICON_COMPONENT_MAP: Record<DocType, IconComponent> = {
  [DOC_TYPES.Pdf]: FilePdf,
  [DOC_TYPES.Csv]: FileCsv,
  [DOC_TYPES.Xls]: FileXls,
  [DOC_TYPES.Zip]: FileZip,
} as const;

export const DEFAULT_FILE_ICON: IconComponent = File;

export const getFileIconComponent = (docType?: string) => {
  if (Object.values(DOC_TYPES).some((type) => docType?.includes(type))) {
    return FILE_TYPE_ICON_COMPONENT_MAP[docType as DocType] ?? DEFAULT_FILE_ICON;
  }
  return DEFAULT_FILE_ICON;
};
