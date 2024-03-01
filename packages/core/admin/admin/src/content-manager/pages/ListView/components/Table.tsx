import * as React from 'react';

import {
  BaseCheckbox,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Typography,
} from '@strapi/design-system';
import {
  ActionBarProps,
  BulkDeleteButtonProps,
  ContentProps,
  EmptyBodyProps,
  HeadProps,
  HeaderCellProps,
  RootProps,
  Table,
  useTableContext,
} from '@strapi/helper-plugin';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import { Modules, Data } from '@strapi/types';
import { useIntl } from 'react-intl';

import { InjectionZoneList } from './InjectionZoneList';
// import { BulkActionButtons } from './BulkActions/Buttons';

/* -------------------------------------------------------------------------------------------------
 * CheckboxDataCell
 * -----------------------------------------------------------------------------------------------*/

interface CheckboxDataCellProps {
  rowId: Data.ID;
  index: number;
}

const CheckboxDataCell = ({ rowId, index }: CheckboxDataCellProps) => {
  const { selectedEntries, onSelectRow } = useTableContext();
  const { formatMessage } = useIntl();
  const isChecked = selectedEntries.findIndex((id) => id === rowId) !== -1;
  const ariaLabel = formatMessage(
    {
      id: 'app.component.table.select.one-entry',
      defaultMessage: `Select {target}`,
    },
    { target: index + 1 }
  );

  return (
    <BaseCheckbox
      aria-label={ariaLabel}
      checked={isChecked}
      onClick={(e) => e.stopPropagation()}
      onChange={() => {
        onSelectRow({
          name: rowId,
          value: !isChecked,
        });
      }}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * BodyImpl
 * -----------------------------------------------------------------------------------------------*/

interface BodyImplProps {
  children?: React.ReactNode;
  onConfirmDelete: (id: Modules.Documents.ID) => Promise<void>;
  isConfirmDeleteRowOpen: boolean;
  setIsConfirmDeleteRowOpen: (isOpen: boolean) => void;
}

const BodyImpl = ({
  children,
  onConfirmDelete,
  isConfirmDeleteRowOpen,
  setIsConfirmDeleteRowOpen,
}: BodyImplProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      // @ts-expect-error – TODO: this needs to be fixed in the helper-plugin.
      await onConfirmDelete(selectedEntries[0]);
      setIsConfirmDeleteRowOpen(false);
      setIsLoading(false);
      setSelectedEntries([]);
    } catch (error) {
      setIsLoading(false);
      setIsConfirmDeleteRowOpen(false);
    }
  };

  return (
    <Table.Body>
      {children}
      <DialogConfirmDelete
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={() => setIsConfirmDeleteRowOpen(!isConfirmDeleteRowOpen)}
        isOpen={isConfirmDeleteRowOpen}
      />
    </Table.Body>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DialogConfirmDelete
 * -----------------------------------------------------------------------------------------------*/
interface DialogConfirmDeleteProps {
  isConfirmButtonLoading?: boolean;
  isOpen?: boolean;
  onConfirm: () => void;
  onToggleDialog: () => void;
}

const DialogConfirmDelete = ({
  isConfirmButtonLoading = false,
  isOpen = false,
  onToggleDialog,
  onConfirm,
}: DialogConfirmDeleteProps) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      })}
      isOpen={isOpen}
    >
      <DialogBody icon={<ExclamationMarkCircle />}>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Flex justifyContent="center">
            <Typography id="confirm-description">
              {formatMessage({
                id: 'components.popUpWarning.message',
                defaultMessage: 'Are you sure you want to delete this?',
              })}
            </Typography>
          </Flex>
          <Flex>
            <InjectionZoneList area="contentManager.listView.deleteModalAdditionalInfos" />
          </Flex>
        </Flex>
      </DialogBody>
      <DialogFooter
        startAction={
          <Button onClick={onToggleDialog} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
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
    </Dialog>
  );
};

const TableImpl: Omit<typeof Table, 'Body' | 'CheckboxDataCell'> & {
  Body: typeof BodyImpl;
  CheckboxDataCell: typeof CheckboxDataCell;
} = {
  ...Table,
  Body: BodyImpl,
  CheckboxDataCell,
};

export { TableImpl as Table };
export type {
  ActionBarProps,
  BulkDeleteButtonProps,
  ContentProps,
  EmptyBodyProps,
  HeadProps,
  HeaderCellProps,
  RootProps,
};
