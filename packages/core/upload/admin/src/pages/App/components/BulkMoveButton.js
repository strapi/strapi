import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Folder from '@strapi/icons/Folder';

import { BulkMoveDialog } from '../../../components/BulkMoveDialog';
import { AssetDefinition, FolderDefinition } from '../../../constants';
import { useBulkMove } from '../../../hooks/useBulkMove';

export const BulkMoveButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { move } = useBulkMove();

  const handleConfirmMove = async ({ moved, destinationFolderId } = {}) => {
    try {
      if (moved) {
        await move(destinationFolderId, selected);
        onSuccess();
      }

      setShowConfirmDialog(false);
      // eslint-ignore-next-line no-empty
    } catch (error) {
      // TODO:
      // - keep dialog open
      // - show error message ?
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="S"
        startIcon={<Folder />}
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
      </Button>

      {showConfirmDialog && <BulkMoveDialog onClose={handleConfirmMove} />}
    </>
  );
};

BulkMoveButton.propTypes = {
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
