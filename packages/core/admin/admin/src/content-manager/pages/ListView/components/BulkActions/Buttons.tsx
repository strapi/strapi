import * as React from 'react';

import { Button, Typography } from '@strapi/design-system';
import { useTracking, useTableContext } from '@strapi/helper-plugin';
import { Check, Trash } from '@strapi/icons';
import { Entity } from '@strapi/types';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useTypedSelector } from '../../../../../core/store/hooks';
import { getTranslation } from '../../../../utils/translations';
import { InjectionZoneList } from '../InjectionZoneList';

import { ConfirmBulkActionDialog, ConfirmDialogPublishAllProps } from './ConfirmBulkActionDialog';
import { SelectedEntriesModal } from './SelectedEntriesModal';

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogUnpublishAll
 * -----------------------------------------------------------------------------------------------*/

const ConfirmDialogUnpublishAll = ({
  isOpen,
  onToggleDialog,
  isConfirmButtonLoading,
  onConfirm,
}: ConfirmDialogPublishAllProps) => {
  const { formatMessage } = useIntl();

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: getTranslation('popUpWarning.bodyMessage.contentType.unpublish.all'),
              defaultMessage: 'Are you sure you want to unpublish these entries?',
            })}
          </Typography>
          <InjectionZoneList area="contentManager.listView.unpublishModalAdditionalInfos" />
        </>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant="secondary"
          startIcon={<Check />}
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: 'app.utils.unpublish',
            defaultMessage: 'Unpublish',
          })}
        </Button>
      }
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialogDeleteAll
 * -----------------------------------------------------------------------------------------------*/

const ConfirmDialogDeleteAll = ({
  isOpen,
  onToggleDialog,
  isConfirmButtonLoading,
  onConfirm,
}: ConfirmDialogPublishAllProps) => {
  const { formatMessage } = useIntl();

  return (
    <ConfirmBulkActionDialog
      isOpen={isOpen}
      onToggleDialog={onToggleDialog}
      dialogBody={
        <>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: getTranslation('popUpWarning.bodyMessage.contentType.delete.all'),
              defaultMessage: 'Are you sure you want to delete these entries?',
            })}
          </Typography>
          <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
        </>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant="danger-light"
          startIcon={<Trash />}
          id="confirm-delete"
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: 'app.components.Button.confirm',
            defaultMessage: 'Confirm',
          })}
        </Button>
      }
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * BulkActionButtons
 * -----------------------------------------------------------------------------------------------*/

interface BulkActionButtonsProps {
  showPublish?: boolean;
  showDelete?: boolean;
  onConfirmDeleteAll: (ids: Entity.ID[]) => Promise<void>;
  onConfirmUnpublishAll: (ids: Entity.ID[]) => Promise<void>;
  refetchData: () => void;
}

const BulkActionButtons = ({
  showPublish = false,
  showDelete = false,
  onConfirmDeleteAll,
  onConfirmUnpublishAll,
  refetchData,
}: BulkActionButtonsProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { data } = useTypedSelector((state) => state['content-manager_listView']);
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = React.useState(false);
  const [isSelectedEntriesModalOpen, setIsSelectedEntriesModalOpen] = React.useState(false);
  const [dialogToOpen, setDialogToOpen] = React.useState<'unpublish' | 'delete' | null>(null);

  // Filters for Bulk actions
  const selectedEntriesObjects = data.filter((entry) => selectedEntries.includes(entry.id));
  const publishButtonIsShown =
    showPublish && selectedEntriesObjects.some((entry) => !entry.publishedAt);
  const unpublishButtonIsShown =
    showPublish && selectedEntriesObjects.some((entry) => entry.publishedAt);

  const toggleDeleteDialog = () => {
    if (dialogToOpen === 'delete') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('delete');
      trackUsage('willBulkDeleteEntries');
    }
  };

  const toggleUnpublishDialog = () => {
    if (dialogToOpen === 'unpublish') {
      setDialogToOpen(null);
    } else {
      setDialogToOpen('unpublish');
      trackUsage('willBulkUnpublishEntries');
    }
  };

  const handleBulkAction =
    (confirmAction: (ids: Entity.ID[]) => Promise<void>, toggleDialog: () => void) => async () => {
      try {
        setIsConfirmButtonLoading(true);
        await confirmAction(selectedEntries);
        setIsConfirmButtonLoading(false);
        toggleDialog();
        setSelectedEntries([]);
      } catch (error) {
        setIsConfirmButtonLoading(false);
        toggleDialog();
      }
    };

  const handleToggleSelectedEntriesModal = () => {
    setIsSelectedEntriesModalOpen((prev) => {
      if (prev) {
        refetchData();
      }

      return !prev;
    });
  };

  return (
    <>
      {publishButtonIsShown && (
        <>
          <Button variant="tertiary" onClick={handleToggleSelectedEntriesModal}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          {isSelectedEntriesModalOpen && (
            <SelectedEntriesModal onToggle={handleToggleSelectedEntriesModal} />
          )}
        </>
      )}
      {unpublishButtonIsShown && (
        <>
          <Button variant="tertiary" onClick={toggleUnpublishDialog}>
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
          <ConfirmDialogUnpublishAll
            isOpen={dialogToOpen === 'unpublish'}
            onToggleDialog={toggleUnpublishDialog}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkAction(onConfirmUnpublishAll, toggleUnpublishDialog)}
          />
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={toggleDeleteDialog}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={dialogToOpen === 'delete'}
            onToggleDialog={toggleDeleteDialog}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleBulkAction(onConfirmDeleteAll, toggleDeleteDialog)}
          />
        </>
      )}
    </>
  );
};

BulkActionButtons.defaultProps = {
  showPublish: false,
  showDelete: false,
  onConfirmDeleteAll() {},
  onConfirmUnpublishAll() {},
  refetchData() {},
};

BulkActionButtons.propTypes = {
  showPublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  onConfirmUnpublishAll: PropTypes.func,
  refetchData: PropTypes.func,
};

export { BulkActionButtons };
