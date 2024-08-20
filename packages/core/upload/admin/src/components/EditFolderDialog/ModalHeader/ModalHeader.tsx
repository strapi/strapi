import { Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

export const EditFolderModalHeader = ({ isEditing = false }: { isEditing?: boolean }) => {
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
