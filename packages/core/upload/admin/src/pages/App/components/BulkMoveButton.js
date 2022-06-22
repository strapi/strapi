import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Folder from '@strapi/icons/Folder';

import { BulkMoveDialog } from '../../../components/BulkMoveDialog';
import { AssetDefinition, FolderDefinition, FolderParentDefinition } from '../../../constants';

export const BulkMoveButton = ({ selected, onSuccess, parentFolder }) => {
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
          parentFolder={parentFolder}
          onClose={handleConfirmMove}
          selected={selected}
        />
      )}
    </>
  );
};

BulkMoveButton.defaultProps = {
  parentFolder: undefined,
};

BulkMoveButton.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  parentFolder: FolderParentDefinition,
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
};
