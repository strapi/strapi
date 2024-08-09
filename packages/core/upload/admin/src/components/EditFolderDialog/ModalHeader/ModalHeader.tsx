import { Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

// TODO: replace with the import from the index file when it will be migrated to TypeScript
import { getTrad } from '../../../utils/getTrad';

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
