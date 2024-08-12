import { Typography } from '@strapi/design-system';
import parseISO from 'date-fns/parseISO';
import { useIntl } from 'react-intl';

// TODO: replace this import with the one from utils when the index file is migrated to typescript
import { formatBytes } from '../../utils/formatBytes';
// TODO: replace this import with the one from utils when the index file is migrated to typescript
import { getFileExtension } from '../../utils/getFileExtension';

import { PreviewCell } from './PreviewCell';

import type { AssetEnriched } from '../../../../shared/contracts/files';

interface CellContentProps {
  cellType: string;
  contentType?: string;
  content: AssetEnriched;
  name: string;
}

export const CellContent = ({ cellType, contentType, content, name }: CellContentProps) => {
  const { formatDate, formatMessage } = useIntl();
  const contentValue = content[name as Extract<keyof AssetEnriched, string>];

  switch (cellType) {
    case 'image':
      return <PreviewCell type={contentType} content={content} />;

    case 'date':
      if (typeof contentValue !== 'string') {
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
      return <Typography>{formatDate(parseISO(contentValue), { dateStyle: 'full' })}</Typography>;

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

      if (typeof contentValue !== 'number' && typeof contentValue !== 'string') {
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

      return <Typography>{formatBytes(contentValue)}</Typography>;

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
        const fileExtension = getFileExtension(contentValue);
        if (fileExtension) {
          return <Typography>{fileExtension.toUpperCase()}</Typography>;
        } else {
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
      }
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

    case 'text':
      if (typeof contentValue === 'string') {
        return <Typography>{contentValue}</Typography>;
      }
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
