import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog } from '@strapi/helper-plugin';

import { useBulkMove } from '../../../hooks/useBulkMove';

export const BulkMoveButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { isLoading, move } = useBulkMove();

  const handleConfirmMove = async () => {
    await move(null, selected);
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
        {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
      </Button>

      <ConfirmDialog
        isConfirmButtonLoading={isLoading}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmMove}
      />
    </>
  );
};

BulkMoveButton.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
