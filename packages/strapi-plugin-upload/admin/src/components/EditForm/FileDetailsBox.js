import React from 'react';
import PropTypes from 'prop-types';
import { dateFormats, dateToUtcTime } from 'strapi-helper-plugin';
import { get } from 'lodash';

import { formatBytes } from '../../utils';

import Flex from '../Flex';
import Text from '../Text';
import FileDetailsBoxWrapper from './FileDetailsBoxWrapper';

const FileDetailsBox = ({ file }) => {
  const sections = [
    {
      key: 0,
      rows: [
        { label: 'size', value: formatBytes(get(file, 'size', 0), 0) },
        {
          label: 'date',
          value: file.created_at ? dateToUtcTime(file.created_at).format(dateFormats.date) : '-',
        },
      ],
    },
    {
      key: 1,
      type: 'spacer',
    },
    {
      key: 2,
      rows: [
        { label: 'dimensions', value: file.width ? `${file.width}x${file.height}` : '-' },
        { label: 'extension', value: file.ext ? file.ext.replace('.', '') : '-' },
      ],
    },
  ];

  return (
    <FileDetailsBoxWrapper>
      {sections.map(({ key, rows, type }) => {
        if (type === 'spacer') {
          return (
            <Text as="section" key={key}>
              <Text>&nbsp;</Text>
            </Text>
          );
        }

        return (
          <Flex justifyContent="space-between" key={key}>
            {rows.map(rowItem => {
              return (
                <Text as="div" key={rowItem.label} style={{ width: '50%' }}>
                  <Text color="grey" fontWeight="bold" textTransform="capitalize">
                    {rowItem.label}
                  </Text>
                  <Text color="grey">{rowItem.value}</Text>
                </Text>
              );
            })}
          </Flex>
        );
      })}
    </FileDetailsBoxWrapper>
  );
};

FileDetailsBox.defaultProps = {
  file: {
    size: 0,
  },
};

FileDetailsBox.propTypes = {
  file: PropTypes.shape({
    created_at: PropTypes.string,
    ext: PropTypes.string,
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    size: PropTypes.number,
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};

export default FileDetailsBox;
