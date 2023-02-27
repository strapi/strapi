import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { ConfirmDialog } from '@strapi/helper-plugin';

import { AssetDefinition, FolderDefinition } from '../../../../constants';
import { useBulkRemove } from '../../../../hooks/useBulkRemove';

export const BulkDeleteButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { isLoading, remove } = useBulkRemove();

  const handleConfirmRemove = async () => {
    await remove(selected);
    onSuccess();
  };

  return (
    <>
      <Button
        variant="danger-light"
        size="S"
        startIcon={<Trash />}
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
      </Button>

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
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
