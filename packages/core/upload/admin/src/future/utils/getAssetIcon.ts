import { SVGProps } from 'react';

import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FileXls,
  FileZip,
  Monitor,
  VolumeUp,
  Images,
} from '@strapi/icons';
import { DefaultTheme } from 'styled-components';

import { AssetType } from '../enums';

import { getFileExtension } from './files';

// NOTE: IconProps interface is not exported from our design library package, so we need to redefine it here
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> {
  /**
   * @default "currentColor"
   */
  fill?: keyof DefaultTheme['colors'] | string;
  stroke?: keyof DefaultTheme['colors'] | string;
}

type IconComponent = React.FC<IconProps>;

const DOC_ICON_MAP: Record<string, IconComponent> = {
  pdf: FilePdf,
  csv: FileCsv,
  xls: FileXls,
  zip: FileZip,
};

export const getAssetIcon = (mime: string | undefined, ext: string | undefined): IconComponent => {
  const fileExtension = getFileExtension(ext);

  if (mime?.includes(AssetType.Image)) {
    return Images;
  }

  if (mime?.includes(AssetType.Video)) {
    return Monitor;
  }

  if (mime?.includes(AssetType.Audio)) {
    return VolumeUp;
  }

  return fileExtension ? DOC_ICON_MAP[fileExtension] || FileIcon : FileIcon;
};
