import { Typography } from '@strapi/design-system';
import parseISO from 'date-fns/parseISO';
import { useIntl } from 'react-intl';

import { formatBytes, getFileExtension } from '../../utils';

import { PreviewCell } from './PreviewCell';

import type { File } from '../../../../shared/contracts/files';

export interface CellContentProps {
  cellType: string;
  contentType?: string;
  content: File;
  name: string;
}

export const CellContent = ({ cellType, contentType, content, name }: CellContentProps) => {
  const { formatDate, formatMessage } = useIntl();
  const contentValue = content[name as Extract<keyof File, string>];

  switch (cellType) {
    case 'image':
      return <PreviewCell type={contentType} content={content} />;

    case 'date':
      if (typeof contentValue === 'string') {
        return <Typography>{formatDate(parseISO(contentValue), { dateStyle: 'full' })}</Typography>;
      }

    case 'size':
      if (contentType === 'folder')
        return (
          <Typography
            aria-label={formatMessage({
              id: 'list.table.content.empty-label',
              defaultMessage: 'This field is empty',
            })}
          >
            -
          </Typography>
        );
      if (typeof contentValue === 'string' || typeof contentValue === 'number') {
        return <Typography>{formatBytes(contentValue)}</Typography>;
      }

    case 'ext':
      if (contentType === 'folder')
        return (
          <Typography
            aria-label={formatMessage({
              id: 'list.table.content.empty-label',
              defaultMessage: 'This field is empty',
            })}
          >
            -
          </Typography>
        );

      if (typeof contentValue === 'string') {
        return <Typography>{getFileExtension(contentValue)?.toUpperCase()}</Typography>;
      }
    case 'text':
      if (typeof contentValue === 'string') {
        return <Typography>{contentValue}</Typography>;
      }

    default:
      return (
        <Typography
          aria-label={formatMessage({
            id: 'list.table.content.empty-label',
            defaultMessage: 'This field is empty',
          })}
        >
          -
        </Typography>
      );
  }
};
