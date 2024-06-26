import { ConfirmDialog, ConfirmDialogProps } from '@strapi/helper-plugin';

import { useDeleteLocale } from '../hooks/useDeleteLocale';
import { Locale } from '../store/reducers';

type DeleteModalProps = {
  localeToDelete: Locale;
  onClose: ConfirmDialogProps['onToggleDialog'];
};

const DeleteModal = ({ localeToDelete, onClose }: DeleteModalProps) => {
  const { isDeleting, deleteLocale } = useDeleteLocale();
  const isOpened = Boolean(localeToDelete);

  const handleDelete = () => deleteLocale(localeToDelete.id).then(onClose);

  return (
    <ConfirmDialog
      isConfirmButtonLoading={isDeleting}
      onConfirm={handleDelete}
      onToggleDialog={onClose}
      isOpen={isOpened}
    />
  );
};

export { DeleteModal };
