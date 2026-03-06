import { SVGProps } from 'react';

import {
  File as FileIcon,
  FileCsv,
  FilePdf,
  FileXls,
  FileZip,
  Play,
  Headphones,
  Image,
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
    return Image;
  }

  if (mime?.includes(AssetType.Video)) {
    return Play;
  }

  if (mime?.includes(AssetType.Audio)) {
    return Headphones;
  }

  return fileExtension ? DOC_ICON_MAP[fileExtension] || FileIcon : FileIcon;
};
