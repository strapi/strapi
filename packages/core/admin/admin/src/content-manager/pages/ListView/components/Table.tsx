import * as React from 'react';

import { BaseCheckbox } from '@strapi/design-system';
import { Table, useTableContext } from '@strapi/helper-plugin';
import { Documents, Entity } from '@strapi/types';
import { useIntl } from 'react-intl';

import { DialogConfirmDelete } from './DialogConfirmDelete';
// import { BulkActionButtons } from './BulkActions/Buttons';

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
 * EntityActionsDataCell
 * -----------------------------------------------------------------------------------------------*/

// interface EntityActionsDataCellProps {
//   rowId: Entity.ID;
//   index: number;
//   canCreate?: boolean;
//   canDelete?: boolean;
//   setIsConfirmDeleteRowOpen: (isOpen: boolean) => void;
//   handleCloneClick: (id: Entity.ID) => () => void;
// }

// const EntityActionsDataCell = ({
//   rowId,
//   index,
//   canCreate = false,
//   canDelete = false,
//   setIsConfirmDeleteRowOpen,
//   handleCloneClick,
// }: EntityActionsDataCellProps) => {
//   const location = useLocation();
//   const { formatMessage } = useIntl();
//   const { trackUsage } = useTracking();
//   const { setSelectedEntries } = useTableContext();
//   const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();

//   const itemLineText = formatMessage(
//     {
//       id: 'content-manager.components.ListViewTable.row-line',
//       defaultMessage: 'item line {number}',
//     },
//     { number: index + 1 }
//   );

//   return (
//     <Flex gap={1} justifyContent="end" onClick={stopPropagation}>
//       <IconButton
//         forwardedAs={Link}
//         onClick={() => {
//           trackUsage('willEditEntryFromButton');
//         }}
//         // @ts-expect-error – DS does not correctly infer props from the as prop.
//         to={{
//           pathname: rowId.toString(),
//           state: { from: location.pathname },
//           search: query.plugins ? stringify({ plugins: query.plugins }) : '',
//         }}
//         label={formatMessage(
//           { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
//           { target: itemLineText }
//         )}
//         borderWidth={0}
//       >
//         <Pencil />
//       </IconButton>

//       {canCreate && (
//         <IconButton
//           onClick={handleCloneClick(rowId)}
//           label={formatMessage(
//             {
//               id: 'app.component.table.duplicate',
//               defaultMessage: 'Duplicate {target}',
//             },
//             { target: itemLineText }
//           )}
//           borderWidth={0}
//         >
//           <Duplicate />
//         </IconButton>
//       )}

//       {canDelete && (
//         <IconButton
//           onClick={() => {
//             trackUsage('willDeleteEntryFromList');
//             setSelectedEntries([rowId]);
//             setIsConfirmDeleteRowOpen(true);
//           }}
//           label={formatMessage(
//             { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
//             { target: itemLineText }
//           )}
//           borderWidth={0}
//         >
//           <Trash />
//         </IconButton>
//       )}
//     </Flex>
//   );
// };

/* -------------------------------------------------------------------------------------------------
 * BodyImpl
 * -----------------------------------------------------------------------------------------------*/

interface BodyImplProps {
  children?: React.ReactNode;
  onConfirmDelete: (id: Documents.ID) => Promise<void>;
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

const TableImpl = {
  ...Table,
  Body: BodyImpl,
  CheckboxDataCell,
};

export { TableImpl as Table };
