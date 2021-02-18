import React from 'react';
import PropTypes from 'prop-types';
import { dateFormats, dateToUtcTime } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { useIntl } from 'react-intl';
import { Text, Flex } from '@buffetjs/core';

import { formatBytes, getTrad } from '../../utils';

import FileDetailsBoxWrapper from './FileDetailsBoxWrapper';

const FileDetailsBox = ({ file }) => {
  const { formatMessage } = useIntl();
  const fileSize = file.mime ? get(file, 'size', 0) : get(file, 'size', 0) / 1000;
  const sections = [
    {
      key: 0,
      rows: [
        { label: 'modal.file-details.size', value: formatBytes(fileSize, 0) },
        {
          label: 'modal.file-details.date',
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
        {
          label: 'modal.file-details.dimensions',
          value: file.width ? `${file.width}×${file.height}` : '-',
        },
        {
          label: 'modal.file-details.extension',
          value: file.ext ? file.ext.replace('.', '') : '-',
          textTransform: 'uppercase',
        },
      ],
    },
  ];

  return (
    <FileDetailsBoxWrapper>
      {sections.map(({ key, rows, type }) => {
        if (type === 'spacer') {
          return (
            <section key={key}>
              <Text lineHeight="18px">&nbsp;</Text>
            </section>
          );
        }

        return (
          <Flex justifyContent="space-between" key={key}>
            {rows.map(rowItem => {
              return (
                <div key={rowItem.label} style={{ width: '50%' }}>
                  <Text color="grey" fontWeight="bold" textTransform="capitalize" lineHeight="18px">
                    {formatMessage({ id: getTrad(rowItem.label) })}
                  </Text>
                  <Text color="grey" textTransform={rowItem.textTransform || ''} lineHeight="18px">
                    {rowItem.value}
                  </Text>
                </div>
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
    mime: PropTypes.string,
    created_at: PropTypes.string,
    ext: PropTypes.string,
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    size: PropTypes.number,
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};

export default FileDetailsBox;
