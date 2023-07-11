import React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition, FolderDefinition } from '../../../../constants';
import getTrad from '../../../../utils/getTrad';

import { BulkDeleteButton } from './BulkDeleteButton';
import { BulkMoveButton } from './BulkMoveButton';

export const BulkActions = ({ selected, onSuccess, currentFolder, folderCount }) => {
  const { formatMessage } = useIntl();
  const numberFolders = selected.filter(({ type }) => type === 'folder').length;
  const numberAssets = selected.filter(({ type }) => type === 'asset').length;
  let showMoveButton = false;

  if (currentFolder) {
    showMoveButton = true;
  } else if (numberAssets && numberFolders) {
    if (numberFolders < folderCount) {
      showMoveButton = true;
    }
  } else if (numberAssets) {
    showMoveButton = folderCount > 0;
  } else if (numberFolders) {
    showMoveButton = numberFolders < folderCount;
  }

  return (
    <Flex gap={2} paddingBottom={5}>
      <Typography variant="epsilon" textColor="neutral600">
        {formatMessage(
          {
            id: getTrad('list.assets.selected'),
            defaultMessage:
              '{numberFolders, plural, one {1 folder} other {# folders}} - {numberAssets, plural, one {1 asset} other {# assets}} selected',
          },
          {
            numberFolders: selected.filter(({ type }) => type === 'folder').length,
            numberAssets: selected.filter(({ type }) => type === 'asset').length,
          }
        )}
      </Typography>

      <BulkDeleteButton selected={selected} onSuccess={onSuccess} />
      {showMoveButton ?
        (<BulkMoveButton currentFolder={currentFolder} selected={selected} onSuccess={onSuccess} />) : null
      }
    </Flex>
  );
};

BulkActions.defaultProps = {
  currentFolder: undefined,
};

BulkActions.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  currentFolder: FolderDefinition,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  folderCount: PropTypes.number.isRequired,
};
