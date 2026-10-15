import * as React from 'react';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Flex, Td, Tooltip, Typography } from '@strapi/design-system';
import { ArrowDown, ArrowUp, Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { css, styled } from 'styled-components';

import { CUSTOM_ORDER_SORT } from '../../../constants/customOrder';
import { useLazyGetAllDocumentsQuery, useMoveDocumentMutation } from '../../../services/documents';
import { getTranslation } from '../../../utils/translations';

import type { DocumentActionComponent } from '../../../content-manager';
import type { Document } from '../../../hooks/useDocument';

/* -------------------------------------------------------------------------------------------------
 * useCustomOrder
 * -----------------------------------------------------------------------------------------------*/

interface CustomOrderState {
  /** Custom order is turned on for the content type. */
  isAvailable: boolean;
  /** The list is sorted by its custom order, so the position of an entry means something. */
  isActive: boolean;
  /** The user is allowed to move entries, and the list is in a state where they can be moved. */
  canReorder: boolean;
  /** A move has been sent and the list has not been fetched again yet. */
  isMoving: boolean;
  /** The entries of the page, in the order they should be displayed. */
  rows: Document[];
  /** 1-based position of an entry of the page in the current view. */
  getPosition: (documentId: string) => number | undefined;
  /** Moves an entry of the page to the place of another entry of the page. */
  moveToIndex: (from: number, to: number) => Promise<void>;
  /** Moves an entry of the page to a position of the current view, on this page or another. */
  moveToPosition: (documentId: string, position: number) => Promise<void>;
}

interface UseCustomOrderOptions {
  model: string;
  isAvailable: boolean;
  canUpdate: boolean;
  sort?: string;
  /**
   * Params of the list request. Reused to find which entry sits at a given position
   * of the same view when it is not on the current page.
   */
  params: Record<string, unknown>;
  results: Document[];
  pagination?: { page: number; pageSize: number; total: number };
  /** Changes every time the list has been fetched. */
  fulfilledTimeStamp?: number;
}

interface PendingMove {
  /** Value of `fulfilledTimeStamp` when the move was sent. */
  fetchedAt?: number;
  /** Order to display until the server answers, when the move stays within the page. */
  order?: string[];
}

const useCustomOrder = ({
  model,
  isAvailable,
  canUpdate,
  sort,
  params,
  results,
  pagination,
  fulfilledTimeStamp,
}: UseCustomOrderOptions): CustomOrderState => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);
  const [moveDocument] = useMoveDocumentMutation();
  const [fetchDocuments] = useLazyGetAllDocumentsQuery();

  const [pendingMove, setPendingMove] = React.useState<PendingMove | null>(null);

  const isActive = isAvailable && sort?.toUpperCase() === CUSTOM_ORDER_SORT.toUpperCase();

  /**
   * The list is fetched again after each move. Until that answer lands, the table keeps
   * showing its rows instead of a loading state, which would make every move blink.
   */
  const isMoving = pendingMove !== null && pendingMove.fetchedAt === fulfilledTimeStamp;

  const rows = React.useMemo(() => {
    if (!isMoving || !pendingMove?.order) {
      return results;
    }

    const rowsById = new Map(results.map((row) => [row.documentId, row]));

    return pendingMove.order.flatMap((documentId) => rowsById.get(documentId) ?? []);
  }, [isMoving, pendingMove, results]);

  const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
  const total = pagination?.total ?? results.length;
  const locale = typeof params.locale === 'string' ? params.locale : undefined;

  const move = async (
    documentId: string,
    anchorId: string,
    placement: 'before' | 'after',
    order?: string[]
  ) => {
    setPendingMove({ fetchedAt: fulfilledTimeStamp, order });

    const res = await moveDocument({
      model,
      id: documentId,
      body: placement === 'before' ? { before: anchorId } : { after: anchorId },
      params: { locale },
    });

    if ('error' in res) {
      setPendingMove(null);
      toggleNotification({ type: 'danger', message: formatAPIError(res.error) });

      return false;
    }

    return true;
  };

  const moveWithinPage = (from: number, to: number) => {
    const moved = rows[from];
    const anchor = rows[to];

    return move(
      moved.documentId,
      anchor.documentId,
      to > from ? 'after' : 'before',
      arrayMove(rows, from, to).map((row) => row.documentId)
    );
  };

  const moveToIndex: CustomOrderState['moveToIndex'] = async (from, to) => {
    if (from === to || !rows[from] || !rows[to]) {
      return;
    }

    await moveWithinPage(from, to);
  };

  const moveToPosition: CustomOrderState['moveToPosition'] = async (documentId, position) => {
    const from = rows.findIndex((row) => row.documentId === documentId);

    if (from === -1 || total === 0) {
      return;
    }

    const currentPosition = offset + from + 1;
    const targetPosition = Math.min(Math.max(Math.trunc(position), 1), total);

    if (targetPosition === currentPosition) {
      return;
    }

    const to = targetPosition - offset - 1;

    if (to >= 0 && to < rows.length) {
      await moveWithinPage(from, to);

      return;
    }

    // The destination is on another page: ask the server which entry sits there in this view
    const res = await fetchDocuments({
      model,
      params: { ...params, page: String(targetPosition), pageSize: '1' },
    });

    if (res.error) {
      toggleNotification({ type: 'danger', message: formatAPIError(res.error) });

      return;
    }

    const anchor = res.data?.results[0];

    if (!anchor) {
      return;
    }

    const hasMoved = await move(
      documentId,
      anchor.documentId,
      targetPosition > currentPosition ? 'after' : 'before'
    );

    if (hasMoved) {
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('custom-order.moved'),
            defaultMessage: 'Entry moved to position {position}',
          },
          { position: targetPosition }
        ),
      });
    }
  };

  return {
    isAvailable,
    isActive,
    canReorder: isActive && canUpdate,
    isMoving,
    rows,
    getPosition(documentId) {
      const index = rows.findIndex((row) => row.documentId === documentId);

      return index === -1 ? undefined : offset + index + 1;
    },
    moveToIndex,
    moveToPosition,
  };
};

const CustomOrderContext = React.createContext<CustomOrderState>({
  isAvailable: false,
  isActive: false,
  canReorder: false,
  isMoving: false,
  rows: [],
  getPosition: () => undefined,
  moveToIndex: async () => {},
  moveToPosition: async () => {},
});

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface RootProps {
  children: React.ReactNode;
  state: CustomOrderState;
}

/**
 * Has to wrap the whole table: the drag and drop context renders elements for screen
 * readers next to its children, and those are not valid inside a table.
 */
const Root = ({ children, state }: RootProps) => {
  // Entries are dragged with a pointer only. The grid owns the arrow keys, so the keyboard
  // goes through the position input and the row actions instead.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = React.useMemo(() => state.rows.map((row) => row.documentId), [state.rows]);

  if (!state.isAvailable) {
    return children;
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    void state.moveToIndex(items.indexOf(String(active.id)), items.indexOf(String(over.id)));
  };

  return (
    <CustomOrderContext.Provider value={state}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items}
          strategy={verticalListSortingStrategy}
          disabled={!state.canReorder || state.isMoving}
        >
          {children}
        </SortableContext>
      </DndContext>
    </CustomOrderContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

type SortableRow = Pick<
  ReturnType<typeof useSortable>,
  'setNodeRef' | 'setActivatorNodeRef' | 'listeners' | 'isDragging'
>;

const SortableRowContext = React.createContext<SortableRow | null>(null);

type RowProps = React.ComponentProps<typeof Table.Row> & {
  documentId: string;
};

/**
 * A table row that can be dragged when the entries follow a custom order,
 * a regular table row otherwise.
 */
const Row = ({ documentId, ...props }: RowProps) => {
  const { isAvailable } = React.useContext(CustomOrderContext);

  if (!isAvailable) {
    return <Table.Row {...props} />;
  }

  return <DraggableRow documentId={documentId} {...props} />;
};

const DraggableRow = ({ documentId, style, ...props }: RowProps) => {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id: documentId });

  const sortableRow = React.useMemo(
    () => ({ setNodeRef, setActivatorNodeRef, listeners, isDragging }),
    [setNodeRef, setActivatorNodeRef, listeners, isDragging]
  );

  // The provider has to stay outside of the row, which only expects cells as children
  return (
    <SortableRowContext.Provider value={sortableRow}>
      <StyledRow
        {...props}
        $isDragging={isDragging}
        style={{ ...style, transform: CSS.Translate.toString(transform), transition }}
      />
    </SortableRowContext.Provider>
  );
};

const StyledRow = styled(Table.Row)<{ $isDragging: boolean }>`
  ${({ $isDragging, theme }) =>
    $isDragging &&
    css`
      position: relative;
      z-index: 1;
      background: ${theme.colors.primary100};
      box-shadow: ${theme.shadows.tableShadow};
    `}
`;

/* -------------------------------------------------------------------------------------------------
 * PositionCell
 * -----------------------------------------------------------------------------------------------*/

type PositionCellProps = React.ComponentProps<typeof Td> & {
  documentId: string;
  position: number;
  total: number;
};

const PositionCell = ({ documentId, position, total, ...props }: PositionCellProps) => {
  const { formatMessage } = useIntl();
  const { isActive, canReorder, isMoving, moveToPosition } = React.useContext(CustomOrderContext);
  const sortableRow = React.useContext(SortableRowContext);
  const [isEditing, setIsEditing] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const shouldRestoreFocus = React.useRef(false);

  /**
   * Table rows don't forward their ref, so the row is reached through its cell.
   */
  const setRowNode = sortableRow?.setNodeRef;
  const setCellNode = React.useCallback(
    (node: HTMLTableCellElement | null) => {
      setRowNode?.(node?.parentElement ?? null);
    },
    [setRowNode]
  );

  React.useEffect(() => {
    if (!isEditing && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Keeps the keys typed in the input away from the keyboard navigation of the grid
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      shouldRestoreFocus.current = true;
      setIsEditing(false);

      const nextPosition = Number.parseInt(e.currentTarget.value, 10);

      if (!Number.isNaN(nextPosition)) {
        void moveToPosition(documentId, nextPosition);
      }
    } else if (e.key === 'Escape') {
      shouldRestoreFocus.current = true;
      setIsEditing(false);
    }
  };

  const renderPosition = () => {
    if (!canReorder) {
      return <Typography textColor="neutral800">{position}</Typography>;
    }

    if (isEditing) {
      return (
        <PositionInput
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the input replaces the button that was just activated
          autoFocus
          aria-label={formatMessage(
            {
              id: getTranslation('custom-order.position.input'),
              defaultMessage: 'New position, from 1 to {total}',
            },
            { total }
          )}
          defaultValue={position}
          inputMode="numeric"
          onBlur={() => setIsEditing(false)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={handleKeyDown}
        />
      );
    }

    return (
      <PositionButton
        ref={buttonRef}
        type="button"
        aria-label={formatMessage(
          {
            id: getTranslation('custom-order.position.button'),
            defaultMessage: 'Position {position} of {total}, change position',
          },
          { position, total }
        )}
        disabled={isMoving}
        onClick={() => setIsEditing(true)}
      >
        {position}
      </PositionButton>
    );
  };

  return (
    <Td ref={setCellNode} {...props} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {isActive ? (
        <Flex gap={1} alignItems="center">
          {canReorder ? (
            <Handle
              ref={sortableRow?.setActivatorNodeRef}
              {...sortableRow?.listeners}
              aria-hidden
              $isDragging={sortableRow?.isDragging ?? false}
            >
              <Drag />
            </Handle>
          ) : null}
          {renderPosition()}
        </Flex>
      ) : (
        <Tooltip
          label={formatMessage({
            id: getTranslation('custom-order.inactive'),
            defaultMessage: 'Sort by order to move entries',
          })}
        >
          <InactiveHandle>
            <Drag />
          </InactiveHandle>
        </Tooltip>
      )}
    </Td>
  );
};

const Handle = styled.span<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spaces[1]};
  color: ${({ theme }) => theme.colors.neutral500};
  cursor: ${({ $isDragging }) => ($isDragging ? 'grabbing' : 'grab')};
  /* Lets a finger drag the row instead of scrolling the page */
  touch-action: none;

  &:hover {
    color: ${({ theme }) => theme.colors.neutral700};
  }
`;

const InactiveHandle = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spaces[1]};
  color: ${({ theme }) => theme.colors.neutral300};
`;

const positionControl = css`
  width: 4.8rem;
  height: 3.2rem;
  padding: 0 ${({ theme }) => theme.spaces[2]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: transparent;
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: ${({ theme }) => theme.fontSizes[2]};
  text-align: left;
`;

const PositionButton = styled.button`
  ${positionControl}
  cursor: text;

  &:hover:not(:disabled),
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.neutral200};
    background: ${({ theme }) => theme.colors.neutral0};
  }

  &:disabled {
    cursor: default;
  }
`;

const PositionInput = styled.input`
  ${positionControl}
  border-color: ${({ theme }) => theme.colors.primary600};
  background: ${({ theme }) => theme.colors.neutral0};
  outline: none;
  box-shadow: ${({ theme }) => theme.colors.primary600} 0px 0px 0px 2px;
`;

/* -------------------------------------------------------------------------------------------------
 * Row actions
 * -----------------------------------------------------------------------------------------------*/

const MoveToTopAction: DocumentActionComponent = ({ documentId }) => {
  const { formatMessage } = useIntl();
  const { canReorder, isMoving, getPosition, moveToPosition } =
    React.useContext(CustomOrderContext);

  if (!canReorder || !documentId) {
    return null;
  }

  return {
    disabled: isMoving || getPosition(documentId) === 1,
    icon: <ArrowUp />,
    label: formatMessage({
      id: 'content-manager.actions.move-to-top.label',
      defaultMessage: 'Move to top',
    }),
    position: 'table-row',
    onClick: () => {
      void moveToPosition(documentId, 1);
    },
  };
};

MoveToTopAction.position = 'table-row';

const MoveToBottomAction: DocumentActionComponent = ({ documentId }) => {
  const { formatMessage } = useIntl();
  const { canReorder, isMoving, moveToPosition } = React.useContext(CustomOrderContext);

  if (!canReorder || !documentId) {
    return null;
  }

  return {
    disabled: isMoving,
    icon: <ArrowDown />,
    label: formatMessage({
      id: 'content-manager.actions.move-to-bottom.label',
      defaultMessage: 'Move to bottom',
    }),
    position: 'table-row',
    onClick: () => {
      // Positions past the end are brought back to the last one
      void moveToPosition(documentId, Number.MAX_SAFE_INTEGER);
    },
  };
};

MoveToBottomAction.position = 'table-row';

const CustomOrder = {
  Root,
  Row,
  PositionCell,
};

export { CustomOrder, useCustomOrder, MoveToTopAction, MoveToBottomAction };
export type { CustomOrderState };
