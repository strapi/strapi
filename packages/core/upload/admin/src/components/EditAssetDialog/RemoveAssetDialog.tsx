import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Dialog } from '@strapi/design-system';

import { useRemoveAsset } from '../../hooks/useRemoveAsset';

import type { File } from '../../../../shared/contracts/files';

interface RemoveAssetDialogProps {
  open: boolean;
  onClose: (open: boolean | null) => void;
  asset: File;
}

export const RemoveAssetDialog = ({ open, onClose, asset }: RemoveAssetDialogProps) => {
  // `null` means asset is deleted
  const { removeAsset } = useRemoveAsset(() => {
    onClose(null);
  });

  const handleConfirm = async (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event?.preventDefault();
    await removeAsset(asset.id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <ConfirmDialog onConfirm={handleConfirm} />
    </Dialog.Root>
  );
};
