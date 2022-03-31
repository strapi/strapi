import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog } from '@strapi/helper-plugin';

import { useBulkRemoveAsset } from '../../../hooks/useBulkRemoveAsset';
import { useBulkRemoveFolder } from '../../../hooks/useBulkRemoveFolder';
import getTrad from '../../../utils/getTrad';

export const BulkDeleteButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { isLoadingAssets, removeAssets } = useBulkRemoveAsset();
  const { isLoadingFolders, removeFolders } = useBulkRemoveFolder();
  const isLoading = isLoadingAssets || isLoadingFolders;

  const handleConfirmRemove = async () => {
    await Promise.all([
      removeAssets(selected.filter(({ type }) => type === 'asset').map(({ asset: { id } }) => id)),
      removeFolders(
        selected.filter(({ type }) => type === 'folder').map(({ folder: { id } }) => id)
      ),
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
