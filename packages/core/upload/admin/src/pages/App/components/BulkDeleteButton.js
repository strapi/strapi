import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Subtitle } from '@strapi/design-system/Text';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useBulkRemoveAsset } from '../../../hooks/useBulkRemoveAsset';
import getTrad from '../../../utils/getTrad';

export const BulkDeleteButton = ({ assetIds, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { isLoading, removeAssets } = useBulkRemoveAsset();

  const handleConfirmRemove = async () => {
    await removeAssets(assetIds);
    onSuccess();
  };

  return (
    <>
      <Stack horizontal size={2} paddingBottom={5}>
        <Subtitle textColor="neutral600">
          {formatMessage(
            {
              id: getTrad('list.assets.selected.plural'),
              defaultMessage: '1 asset selected',
            },
            {
              number: assetIds.length,
            }
          )}
        </Subtitle>
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
  assetIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
