import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import parseISO from 'date-fns/parseISO';
import { getFileExtension } from '@strapi/helper-plugin';
import { Typography } from '@strapi/design-system/Typography';

import { PreviewCell } from './PreviewCell';
import { formatBytes } from '../../utils';

export const CellContent = ({
  alternativeText,
  content,
  cellType,
  elementType,
  mime,
  fileExtension,
  thumbnailURL,
  url,
}) => {
  const { formatDate, formatMessage } = useIntl();

  switch (cellType) {
    case 'image':
      return (
        <PreviewCell
          alternativeText={alternativeText}
          fileExtension={fileExtension}
          mime={mime}
          type={elementType}
          thumbnailURL={thumbnailURL}
          url={url}
        />
      );
    case 'date':
      return <Typography>{formatDate(parseISO(content), { dateStyle: 'full' })}</Typography>;

    case 'size':
      if (elementType === 'folder')
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

      return <Typography>{formatBytes(content)}</Typography>;

    case 'ext':
      if (elementType === 'folder')
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

      return <Typography>{getFileExtension(content).toUpperCase()}</Typography>;

    case 'text':
      return <Typography>{content}</Typography>;

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

CellContent.defaultProps = {
  alternativeText: null,
  content: '',
  fileExtension: '',
  mime: '',
  thumbnailURL: null,
  url: null,
};

CellContent.propTypes = {
  alternativeText: PropTypes.string,
  content: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  fileExtension: PropTypes.string,
  mime: PropTypes.string,
  thumbnailURL: PropTypes.string,
  cellType: PropTypes.string.isRequired,
  elementType: PropTypes.string.isRequired,
  url: PropTypes.string,
};
