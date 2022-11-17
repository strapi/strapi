import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Table, Th, Thead, Tr } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';

import { getTrad } from '../../utils';
import { AssetDefinition, tableHeaders, FolderDefinition } from '../../constants';
import { TableRows } from './TableRows';

export const AssetTableList = ({
  assetCount,
  folderCount,
  onEditAsset,
  onEditFolder,
  onSelectAll,
  onSelectOne,
  rows,
  selected,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <Table colCount={tableHeaders.length + 2} rowCount={assetCount + folderCount + 1}>
      <Thead>
        <Tr>
          <Th>
            <BaseCheckbox
              aria-label={formatMessage({
                id: getTrad('bulk.select.label'),
                defaultMessage: 'Select all folders & assets',
              })}
              indeterminate={selected?.length > 0 && selected?.length !== assetCount + folderCount}
              onChange={(e) => {
                if (e.target.checked) {
                  trackUsage('didSelectAllMediaLibraryElements');
                }
                onSelectAll(rows);
              }}
              value={
                (assetCount > 0 || folderCount > 0) && selected.length === assetCount + folderCount
              }
            />
          </Th>
          {tableHeaders.map(({ metadatas, key }) => {
            return (
              <Th key={key}>
                <Typography textColor="neutral600" variant="sigma">
                  {formatMessage(metadatas.label)}
                </Typography>
              </Th>
            );
          })}
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: getTrad('list-table-header-actions'),
                defaultMessage: 'actions',
              })}
            </VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <TableRows
        onEditAsset={onEditAsset}
        onEditFolder={onEditFolder}
        rows={rows}
        onSelectOne={onSelectOne}
        selected={selected}
      />
    </Table>
  );
};

AssetTableList.defaultProps = {
  assetCount: 0,
  folderCount: 0,
  onEditAsset: null,
  onEditFolder: null,
  rows: [],
  selected: [],
};

AssetTableList.propTypes = {
  assetCount: PropTypes.number,
  folderCount: PropTypes.number,
  onEditAsset: PropTypes.func,
  onEditFolder: PropTypes.func,
  onSelectAll: PropTypes.func.isRequired,
  onSelectOne: PropTypes.func.isRequired,
  rows: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition),
};
