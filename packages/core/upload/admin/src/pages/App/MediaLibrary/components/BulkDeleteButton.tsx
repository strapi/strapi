import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Button, Dialog } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Asset } from '../../../../../../shared/contracts/files';
import { Folder } from '../../../../../../shared/contracts/folders';
import { useBulkRemove } from '../../../../hooks/useBulkRemove';

interface FolderWithType extends Folder {
  type: string;
}

export interface AssetWithType extends Asset {
  type: string;
}

export interface BulkDeleteButtonProps {
  selected: (AssetWithType | FolderWithType)[];
  onSuccess: () => void;
}

export const BulkDeleteButton = ({ selected, onSuccess }: BulkDeleteButtonProps) => {
  const { formatMessage } = useIntl();
  const { remove } = useBulkRemove();

  const handleConfirmRemove = async () => {
    await remove(selected);
    onSuccess();
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button variant="danger-light" size="S" startIcon={<Trash />}>
          {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
        </Button>
      </Dialog.Trigger>
      <ConfirmDialog onConfirm={handleConfirmRemove} />
    </Dialog.Root>
  );
};
