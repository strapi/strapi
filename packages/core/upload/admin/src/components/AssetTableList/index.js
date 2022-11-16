import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Table, Th, Thead, Tr } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';

import { getTrad } from '../../utils';
import { AssetDefinition } from '../../constants';
import { tableHeaders } from './utils/tableHeaders';
import { TableRows } from './TableRows';

export const AssetTableList = ({ assets, onEditAsset, onSelectAsset, selectedAssets }) => {
  const { formatMessage } = useIntl();

  const headers = tableHeaders.map((header) => ({
    ...header,
    metadatas: {
      ...header.metadatas,
      label: formatMessage(header.metadatas.label),
    },
  }));

  return (
    <Table colCount={tableHeaders.length} rowCount={assets.length}>
      <Thead>
        <Tr>
          <Th>
            {/* TODO: Replace ML BaseCheckbox select all with this one when adding folders to Table */}
            <BaseCheckbox
              aria-label={formatMessage({
                id: getTrad('bulk.select.label'),
                defaultMessage: 'Select all folders & assets',
              })}
              onValueChange={() => {}}
              // TODO: remove disabled once this checkbox will replace the current one used to bulk select
              disabled
            />
          </Th>
          {headers.map(({ metadatas, key }) => {
            return (
              <Th key={key}>
                <Typography textColor="neutral600" variant="sigma">
                  {metadatas.label}
                </Typography>
              </Th>
            );
          })}
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('control-card.edit'),
                defaultMessage: 'Edit',
              })}
            </VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <TableRows
        onEditAsset={onEditAsset}
        assets={assets}
        onSelectAsset={onSelectAsset}
        selectedAssets={selectedAssets}
      />
    </Table>
  );
};

AssetTableList.defaultProps = {
  onEditAsset: null,
  onSelectAsset: null,
  selectedAssets: [],
};

AssetTableList.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func,
  selectedAssets: PropTypes.arrayOf(AssetDefinition),
};
