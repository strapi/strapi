import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';

import { AssetDefinition, FolderDefinition, FolderParentDefinition } from '../../../constants';
import getTrad from '../../../utils/getTrad';
import { BulkDeleteButton } from './BulkDeleteButton';
import { BulkMoveButton } from './BulkMoveButton';

export const BulkActions = ({ selected, onSuccess, parentFolder }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack horizontal spacing={2} paddingBottom={5}>
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
      <BulkMoveButton parentFolder={parentFolder} selected={selected} onSuccess={onSuccess} />
    </Stack>
  );
};

BulkActions.defaultProps = {
  parentFolder: undefined,
};

BulkActions.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  parentFolder: FolderParentDefinition,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
};
