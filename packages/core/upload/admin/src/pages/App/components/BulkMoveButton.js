import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import isEmpty from 'lodash/isEmpty';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import Folder from '@strapi/icons/Folder';
import { getAPIInnerErrors } from '@strapi/helper-plugin';

import { BulkMoveDialog } from '../../../components/BulkMoveDialog';
import { AssetDefinition, FolderDefinition } from '../../../constants';
import { useBulkMove } from '../../../hooks/useBulkMove';
import { getTrad } from '../../../utils';

export const BulkMoveButton = ({ selected, onSuccess }) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogErrors, setDialogErrors] = useState(null);
  const { move } = useBulkMove();

  const handleConfirmMove = async ({ moved, destinationFolderId } = {}) => {
    try {
      if (moved) {
        await move(destinationFolderId, selected);
        onSuccess();
      }

      setShowConfirmDialog(false);
      // eslint-ignore-next-line no-empty
    } catch (error) {
      const errors = getAPIInnerErrors(error, { getTrad });
      const formikErrors = Object.entries(errors).reduce((acc, [key, error]) => {
        acc[key ?? 'destination'] = error.defaultMessage;

        return acc;
      }, {});

      if (!isEmpty(formikErrors)) {
        setDialogErrors(formikErrors);
      }
    }
  };

  useEffect(() => {
    setShowConfirmDialog(!!dialogErrors);
  }, [dialogErrors, setShowConfirmDialog]);

  return (
    <>
      <Button
        variant="secondary"
        size="S"
        startIcon={<Folder />}
        onClick={() => setShowConfirmDialog(true)}
      >
        {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
      </Button>

      {showConfirmDialog && <BulkMoveDialog onClose={handleConfirmMove} errors={dialogErrors} />}
    </>
  );
};

BulkMoveButton.propTypes = {
  selected: PropTypes.arrayOf(AssetDefinition, FolderDefinition).isRequired,
  onSuccess: PropTypes.func.isRequired,
};
