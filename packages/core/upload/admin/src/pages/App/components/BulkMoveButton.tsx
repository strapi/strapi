import * as React from 'react';

import { Button, Modal } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { BulkMoveDialog } from '../../../components/BulkMoveDialog/BulkMoveDialog';

import type { File } from '../../../../../shared/contracts/files';
import type { Folder as FolderDefinition } from '../../../../../shared/contracts/folders';

interface FileWithType extends File {
  type: string;
}

interface FolderWithType extends FolderDefinition {
  type: string;
}

export interface BulkMoveButtonProps {
  onSuccess: () => void;
  currentFolder?: FolderWithType;
  selected: Array<FolderWithType | FileWithType>;
}

export const BulkMoveButton = ({ selected, onSuccess, currentFolder }: BulkMoveButtonProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

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
