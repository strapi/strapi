import * as React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';
import type { Asset } from '../../../../shared/contracts/files';

import { useRemoveAsset } from '../../hooks/useRemoveAsset';

interface RemoveAssetDialogProps {
  onClose: () => void;
  open: boolean;
  asset: Asset;
}

export const RemoveAssetDialog = ({ open, onClose, asset }: RemoveAssetDialogProps) => {
  const { removeAsset } = useRemoveAsset(() => {
    onClose();
  });

  const handleConfirm = async (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (event) {
      event.preventDefault();
    }
   
    await removeAsset(asset.id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <ConfirmDialog onConfirm={handleConfirm} />
    </Dialog.Root>
  );
};
