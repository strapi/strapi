import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { getFileExtension } from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { IconButton } from '@strapi/design-system/IconButton';
import { Tbody, Td, Tr } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import Pencil from '@strapi/icons/Pencil';

import { PreviewCell } from './PreviewCell';
import { AssetDefinition } from '../../constants';
import { formatBytes, getTrad } from '../../utils';

export const TableRows = ({ assets, onEditAsset, onSelectAsset, selectedAssets }) => {
  const { formatDate, formatMessage } = useIntl();

  return (
    <Tbody>
      {assets.map((asset) => {
        const { alternativeText, id, name, ext, size, createdAt, updatedAt, url, mime, formats } =
          asset;

        const isSelected = !!selectedAssets.find((currentAsset) => currentAsset.id === id);

        return (
          <Tr key={id}>
            <Td>
              <BaseCheckbox
                aria-label={formatMessage({
                  id: 'global.select-all-entries',
                  defaultMessage: 'Select all entries',
                })}
                onValueChange={() => onSelectAsset({ ...asset, type: 'asset' })}
                checked={isSelected}
              />
            </Td>
            <Td>
              <PreviewCell
                alternativeText={alternativeText}
                fileExtension={getFileExtension(ext)}
                mime={mime}
                name={name}
                thumbnailURL={formats?.thumbnail?.url}
                url={url}
              />
            </Td>
            <Td>
              <Typography>{name}</Typography>
            </Td>
            <Td>
              <Typography>{getFileExtension(ext).toUpperCase()}</Typography>
            </Td>
            <Td>
              <Typography>{formatBytes(size)}</Typography>
            </Td>
            <Td>
              <Typography>{formatDate(new Date(createdAt))}</Typography>
            </Td>
            <Td>
              <Typography>{formatDate(new Date(updatedAt))}</Typography>
            </Td>
            {onEditAsset && (
              <Td>
                <IconButton
                  label={formatMessage({
                    id: getTrad('control-card.edit'),
                    defaultMessage: 'Edit',
                  })}
                  icon={<Pencil />}
                  onClick={() => onEditAsset(asset)}
                />
              </Td>
            )}
          </Tr>
        );
      })}
    </Tbody>
  );
};

TableRows.defaultProps = {
  onEditAsset: null,
  onSelectAsset: null,
  selectedAssets: [],
};

TableRows.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func,
  selectedAssets: PropTypes.arrayOf(AssetDefinition),
};
