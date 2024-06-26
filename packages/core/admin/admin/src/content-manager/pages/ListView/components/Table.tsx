import * as React from 'react';

import { BaseCheckbox, IconButton, Flex } from '@strapi/design-system';
import {
  useTracking,
  useTableContext,
  Table as HelperPluginTable,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { Entity } from '@strapi/types';
import { Location } from 'history';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { DialogConfirmDelete } from './DialogConfirmDelete';

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

/* -------------------------------------------------------------------------------------------------
 * CheckboxDataCell
 * -----------------------------------------------------------------------------------------------*/

interface CheckboxDataCellProps {
  rowId: Entity.ID;
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
      onClick={stopPropagation}
      onChange={() => {
        onSelectRow({ name: rowId, value: !isChecked });
      }}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * EntityActionsDataCell
 * -----------------------------------------------------------------------------------------------*/

interface EntityActionsDataCellProps {
  rowId: Entity.ID;
  index: number;
  canCreate?: boolean;
  canDelete?: boolean;
  setIsConfirmDeleteRowOpen: (isOpen: boolean) => void;
  handleCloneClick: (id: Entity.ID) => () => void;
}

const EntityActionsDataCell = ({
  rowId,
  index,
  canCreate = false,
  canDelete = false,
  setIsConfirmDeleteRowOpen,
  handleCloneClick,
}: EntityActionsDataCellProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { setSelectedEntries } = useTableContext();
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();

  const itemLineText = formatMessage(
    {
      id: 'content-manager.components.ListViewTable.row-line',
      defaultMessage: 'item line {number}',
    },
    { number: index + 1 }
  );

  return (
    <Flex gap={1} justifyContent="end" onClick={stopPropagation}>
      <IconButton
        forwardedAs={Link}
        onClick={() => {
          trackUsage('willEditEntryFromButton');
        }}
        // @ts-expect-error – DS does not correctly infer props from the as prop.
        to={(location: Location) => ({
          pathname: `${location.pathname}/${rowId}`,
          state: { from: location.pathname },
          search: query.plugins ? stringify({ plugins: query.plugins }) : '',
        })}
        label={formatMessage(
          { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
          { target: itemLineText }
        )}
        borderWidth={0}
      >
        <Pencil />
      </IconButton>

      {canCreate && (
        <IconButton
          onClick={handleCloneClick(rowId)}
          label={formatMessage(
            {
              id: 'app.component.table.duplicate',
              defaultMessage: 'Duplicate {target}',
            },
            { target: itemLineText }
          )}
          borderWidth={0}
        >
          <Duplicate />
        </IconButton>
      )}

      {canDelete && (
        <IconButton
          onClick={() => {
            trackUsage('willDeleteEntryFromList');
            setSelectedEntries([rowId]);
            setIsConfirmDeleteRowOpen(true);
          }}
          label={formatMessage(
            { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
            { target: itemLineText }
          )}
          borderWidth={0}
        >
          <Trash />
        </IconButton>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface RootProps {
  children: React.ReactNode;
  onConfirmDelete: (id: Entity.ID) => Promise<void>;
  isConfirmDeleteRowOpen: boolean;
  setIsConfirmDeleteRowOpen: (isOpen: boolean) => void;
}

const Root = ({
  children,
  onConfirmDelete,
  isConfirmDeleteRowOpen,
  setIsConfirmDeleteRowOpen,
}: RootProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
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
    <HelperPluginTable.Body>
      {children}
      <DialogConfirmDelete
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={() => setIsConfirmDeleteRowOpen(!isConfirmDeleteRowOpen)}
        isOpen={isConfirmDeleteRowOpen}
      />
    </HelperPluginTable.Body>
  );
};

const Table = { CheckboxDataCell, EntityActionsDataCell, Root };
type TableProps = RootProps;

export { Table };
export type { TableProps };
