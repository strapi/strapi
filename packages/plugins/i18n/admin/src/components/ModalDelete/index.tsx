import { ConfirmDialog } from '@strapi/helper-plugin';

import useDeleteLocale from '../../hooks/useDeleteLocale';

type ModelDeleteProps = {
  localeToDelete: {
    id: number;
  };
  onClose: () => void;
};

const ModalDelete = ({ localeToDelete, onClose }: ModelDeleteProps) => {
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

export default ModalDelete;
