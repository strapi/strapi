import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { getFileExtension } from '@strapi/helper-plugin';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';

import { AssetDefinition } from '../../constants';
import formatBytes from '../../utils/formatBytes';

export const TableRows = ({ assets }) => {
  const { formatDate } = useIntl();

  return (
    <Tbody>
      {assets.map((asset) => {
        // console.log(asset);
        const { id, name, ext, size, createdAt } = asset;

        return (
          <Tr key={id}>
            <Td>
              <Typography>TODO</Typography>
            </Td>
            <Td>
              <Typography>{name}</Typography>
            </Td>
            <Td>
              <Typography>{getFileExtension(ext)}</Typography>
            </Td>
            <Td>
              <Typography>{formatBytes(size)}</Typography>
            </Td>
            <Td>
              <Typography>{formatDate(new Date(createdAt))}</Typography>
            </Td>
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
};
