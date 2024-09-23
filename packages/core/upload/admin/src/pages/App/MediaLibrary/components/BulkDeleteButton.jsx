import * as React from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Button, Dialog } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition, FolderDefinition } from '../../../../constants';
import { useBulkRemove } from '../../../../hooks/useBulkRemove';

export const BulkDeleteButton = ({ selected, onSuccess }) => {
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

BulkDeleteButton.propTypes = {
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
