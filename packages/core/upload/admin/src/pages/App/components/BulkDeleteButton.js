import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useBulkRemoveAsset } from '../../../hooks/useBulkRemoveAsset';
import getTrad from '../../../utils/getTrad';

export const BulkDeleteButton = ({ selectedAssets, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { isLoading, removeAssets } = useBulkRemoveAsset();

  const handleConfirmRemove = async () => {
    await removeAssets(selectedAssets.map(({ id }) => id));
    onSuccess();
  };

  return (
    <>
      <Stack horizontal size={2} paddingBottom={5}>
        <Typography variant="epsilon" textColor="neutral600">
          {formatMessage(
            {
              id: getTrad('list.assets.selected'),
              defaultMessage:
                '{number, plural, =0 {No asset} one {1 asset} other {# assets}} selected',
            },
            {
              number: selectedAssets.length,
            }
          )}
        </Typography>
        <Button
          variant="danger-light"
          size="S"
          startIcon={<Trash />}
          onClick={() => setShowConfirmDialog(true)}
        >
          {formatMessage({ id: getTrad('control-card.delete'), defaultMessage: 'Delete' })}
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
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
