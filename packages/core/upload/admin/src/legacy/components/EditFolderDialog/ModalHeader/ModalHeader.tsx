import { Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

interface EditFolderModalHeaderProps {
  isEditing?: boolean;
}

export const EditFolderModalHeader = ({ isEditing = false }: EditFolderModalHeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Header>
      <Modal.Title>
        {formatMessage(
          isEditing
            ? {
                id: getTrad('modal.folder.edit.title'),
                defaultMessage: 'Edit folder',
              }
            : {
                id: getTrad('modal.folder.create.title'),
                defaultMessage: 'Add new folder',
              }
        )}
      </Modal.Title>
    </Modal.Header>
  );
};
