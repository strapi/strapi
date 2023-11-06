import React from 'react';

import { Typography } from '@strapi/design-system';
import { getFileExtension } from '@strapi/helper-plugin';
import parseISO from 'date-fns/parseISO';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { formatBytes } from '../../utils';

import { PreviewCell } from './PreviewCell';

export const CellContent = ({ cellType, contentType, content, name }) => {
  const { formatDate, formatMessage } = useIntl();

  switch (cellType) {
    case 'image':
      return <PreviewCell type={contentType} content={content} />;

    case 'date':
      return <Typography>{formatDate(parseISO(content[name]), { dateStyle: 'full' })}</Typography>;

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

      return <Typography>{formatBytes(content[name])}</Typography>;

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

      return <Typography>{getFileExtension(content[name]).toUpperCase()}</Typography>;

    case 'text':
      return <Typography>{content[name]}</Typography>;

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

CellContent.propTypes = {
  cellType: PropTypes.string.isRequired,
  contentType: PropTypes.string.isRequired,
  content: PropTypes.shape({
    alternativeText: PropTypes.string,
    ext: PropTypes.string,
    formats: PropTypes.shape({
      thumbnail: PropTypes.shape({
        url: PropTypes.string,
      }),
    }),
    mime: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
  name: PropTypes.string.isRequired,
};
