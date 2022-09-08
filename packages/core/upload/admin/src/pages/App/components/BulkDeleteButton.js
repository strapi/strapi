import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useLocation, useHistory } from 'react-router-dom';
import { Button } from '@strapi/design-system/Button';
import Trash from '@strapi/icons/Trash';
import { ConfirmDialog, useQueryParams } from '@strapi/helper-plugin';
import { stringify } from 'qs';

import { AssetDefinition, FolderDefinition } from '../../../constants';
import { useBulkRemove } from '../../../hooks/useBulkRemove';

export const BulkDeleteButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { isLoading, remove } = useBulkRemove();
  const { push } = useHistory();
  const { pathname } = useLocation();
  const [{ query }] = useQueryParams();

  const handleConfirmRemove = async () => {
    const { page, pageSize, assetCount, ...others } = query;
    const isSelected = selected?.length >= Number(assetCount);
    const numOfSelectedPages = Math.ceil(selected?.length / Number(pageSize));
    const queryParams = {
      ...others,
      pageSize,
      page: isSelected && page !== '1' ? Number(page) - numOfSelectedPages : page,
    };

    await remove(selected);
    push({ pathname, search: stringify(queryParams) });
    onSuccess();
  };

  return (
    <>
      <Button
        variant="danger-light"
        size="S"
        startIcon={<Trash />}
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
      </Button>

      <ConfirmDialog
        isConfirmButtonLoading={isLoading}
        isOpen={showConfirmDialog}
        onToggleDialog={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
};

BulkDeleteButton.propTypes = {
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
