import * as React from 'react';

import { Button } from '@strapi/design-system';
import {
  ConfirmDialog,
  useAPIErrorHandler,
  useCMEditViewDataManager,
  useNotification,
} from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import { isAxiosError } from 'axios';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/translations';

import type { RenderChildProps } from '../../../components/ContentTypeFormWrapper';

interface DeleteLinkProps {
  onDelete: RenderChildProps['onDelete'];
}

const DeleteLink = ({ onDelete }: DeleteLinkProps) => {
  const { hasDraftAndPublish, modifiedData } = useCMEditViewDataManager();

  const trackerProperty = hasDraftAndPublish
    ? typeof modifiedData.publishedAt === 'string'
      ? { status: 'draft' }
      : { status: 'published' }
    : {};

  const [displayDeleteConfirmation, setDisplayDeleteConfirmation] = React.useState(false);
  const [isModalConfirmButtonLoading, setIsModalConfirmButtonLoading] = React.useState(false);
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const toggleNotification = useNotification();

  const toggleWarningDelete = () => setDisplayDeleteConfirmation((prevState) => !prevState);

  const handleConfirmDelete = async () => {
    try {
      // Show the loading state
      setIsModalConfirmButtonLoading(true);

      await onDelete(trackerProperty);

      setIsModalConfirmButtonLoading(false);

      toggleWarningDelete();
    } catch (err) {
      setIsModalConfirmButtonLoading(false);
      toggleWarningDelete();

      if (isAxiosError(err)) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    }
  };

  return (
    <>
      <Button onClick={toggleWarningDelete} size="S" startIcon={<Trash />} variant="danger-light">
        {formatMessage({
          id: getTranslation('containers.Edit.delete-entry'),
          defaultMessage: 'Delete this entry',
        })}
      </Button>

      <ConfirmDialog
        isConfirmButtonLoading={isModalConfirmButtonLoading}
        isOpen={displayDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        onToggleDialog={toggleWarningDelete}
      />
    </>
  );
};

export { DeleteLink };
