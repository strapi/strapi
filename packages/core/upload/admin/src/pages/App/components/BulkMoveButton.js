import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system';
import Folder from '@strapi/icons/Folder';

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
    <>
      <Button
        variant="secondary"
        size="S"
        startIcon={<Folder />}
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
      </Button>

      {showConfirmDialog && (
        <BulkMoveDialog
          currentFolder={currentFolder}
          onClose={handleConfirmMove}
          selected={selected}
        />
      )}
    </>
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
