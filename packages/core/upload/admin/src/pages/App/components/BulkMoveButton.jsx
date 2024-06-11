import React, { useState } from 'react';

import { Button, Modal } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { BulkMoveDialog } from '../../../components/BulkMoveDialog';
import { AssetDefinition, FolderDefinition } from '../../../constants';

export const BulkMoveButton = ({ selected, onSuccess, currentFolder }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmMove = () => {
    setShowConfirmDialog(false);
    onSuccess();
  };

  return (
    <Modal.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <Modal.Trigger>
        <Button variant="secondary" size="S" startIcon={<Folder />}>
          {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
        </Button>
      </Modal.Trigger>
      <BulkMoveDialog
        currentFolder={currentFolder}
        onClose={handleConfirmMove}
        selected={selected}
      />
    </Modal.Root>
  );
};

BulkMoveButton.defaultProps = {
  currentFolder: undefined,
};

BulkMoveButton.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  currentFolder: FolderDefinition,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
};
