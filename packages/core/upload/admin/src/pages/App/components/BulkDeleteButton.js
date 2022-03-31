import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog } from '@strapi/helper-plugin';

import { useBulkRemove } from '../../../hooks/useBulkRemove';
import getTrad from '../../../utils/getTrad';

export const BulkDeleteButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { isLoading: isLoadingAssets, remove: removeAssets } = useBulkRemove('assets');
  const { isLoading: isLoadingFolders, remove: removeFolders } = useBulkRemove('folders');

  const isLoading = isLoadingAssets || isLoadingFolders;

  const handleConfirmRemove = async () => {
    const assets = selected.filter(({ type }) => type === 'asset');
    const folders = selected.filter(({ type }) => type === 'folder');

    await Promise.all([
      assets.length > 0 && removeAssets(assets.map(({ asset: { id } }) => id)),
      folders.length > 0 && removeFolders(folders.map(({ folder: { id } }) => id)),
    ]);

    onSuccess();
  };

  return (
    <>
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
        <Button
          variant="danger-light"
          size="S"
          startIcon={<Trash />}
          onClick={() => setShowConfirmDialog(true)}
        >
          {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
        </Button>
      </Stack>

      <ConfirmDialog
        isConfirmButtonLoading={isLoading}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
};

BulkDeleteButton.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
