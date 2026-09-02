import { useIsDesktop } from '@strapi/admin/strapi-admin';
import {
  Checkbox,
  Flex,
  Loader,
  RawTable,
  RawTbody,
  RawTd,
  RawTh,
  RawThead,
  RawTr,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Folder as FolderIcon, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, css } from 'styled-components';

import { TruncatedText } from '../../../components/TruncatedText';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useTracking } from '../../../hooks/useTracking';
import { formatBytes } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { isEventFromWithin } from '../../../utils/isEventFromWithin';
import { getTranslationKey } from '../../../utils/translations';
import { TABLE_HEADERS } from '../constants';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useBusyAssetsOptional } from '../hooks/useBusyAssets';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { type MixedItem } from '../utils/mergeMixedList';
import { buildRenderedKeys } from '../utils/renderedKeys';
import { assetKey, folderKey, getSelectAllState, type ItemKey } from '../utils/selection';

import { AssetActionsMenu } from './AssetActionsMenu';
import { useAssetsDndOptional } from './Dnd/AssetsDndProvider';
import { useFileDraggable, useFolderDraggableDroppable } from './Dnd/useAssetDnd';
import { FolderActionsMenu } from './FolderActionsMenu';

import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

const StyledTable = styled(RawTable)`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 4px;
  overflow: hidden;

  /* An auto layout lets every column but the name size itself to its content,
     so the dates never wrap. The name cell is what absorbs the leftover and
     ellipsizes — see NameTd. */
  table-layout: auto;

  & td:last-child,
  & th:last-child {
    width: 5.6rem;
    white-space: nowrap;
  }
`;

const StyledThead = styled(RawThead)`
  background: ${({ theme }) => theme.colors.neutral100};

  tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
`;

/**
 * Column sizing, applied to the header and body cells alike.
 *
 * `hug` shrinks a column to its content: `width: 1%` is a floor the content
 * overrides, and `nowrap` stops a date breaking across lines.
 *
 * `flex` claims everything left over. `width: 100%` asks for all of it and
 * `max-width: 0` is what allows the cell to be narrower than its content, which
 * is what lets the name inside ellipsize instead of widening the table.
 */
const hugColumn = css`
  width: 1%;
  white-space: nowrap;
`;

const flexColumn = css`
  width: 100%;
  max-width: 0;
  overflow: hidden;
`;

const StyledTh = styled(RawTh)<{ $flex?: boolean }>`
  height: 40px;
  padding: 0 ${({ theme }) => theme.spaces[4]};
  text-align: left;

  ${({ $flex }) => ($flex ? flexColumn : hugColumn)}
`;

const StyledTd = styled(RawTd)`
  padding: 0 ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

/** The name column: takes whatever the others leave and ellipsizes. */
const NameTd = styled(StyledTd)`
  ${flexColumn}
`;

/** Every other column: as wide as its content, never wrapping. */
const HugTd = styled(StyledTd)`
  ${hugColumn}
`;

const StyledTr = styled.tr<{
  $isDragging?: boolean;
  $isMovePending?: boolean;
  $isBusy?: boolean;
  $isValidDropTarget?: boolean;
  $isInvalidDropTarget?: boolean;
  $isSelected?: boolean;
}>`
  height: 48px;
  user-select: none;
  background: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.primary100 : theme.colors.neutral0};
  cursor: ${({ $isMovePending, $isBusy, $isInvalidDropTarget }) => {
    if ($isMovePending || $isBusy) {
      return 'wait';
    }

    return $isInvalidDropTarget ? 'not-allowed' : 'pointer';
  }};
  opacity: ${({ $isDragging, $isBusy }) => ($isDragging || $isBusy ? 0.4 : 1)};
  pointer-events: ${({ $isMovePending, $isBusy }) => ($isMovePending || $isBusy ? 'none' : 'auto')};

  ${({ $isValidDropTarget, theme }) =>
    $isValidDropTarget &&
    css`
      background: ${theme.colors.primary100};
      outline: 1px dashed ${theme.colors.primary600};
      outline-offset: -1px;
    `}

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }

  &:last-child {
    ${StyledTd} {
      border-bottom: 0;
    }
  }
`;

// Leading checkbox column. Fixed narrow width so it holds its own column under
// the mobile fixed table-layout (a 1% width would collapse and let the name
// cell's preview overlap the control).
const CheckboxTd = styled(StyledTd)`
  width: 5.6rem;
  white-space: nowrap;
`;

const CheckboxTh = styled(StyledTh)`
  width: 5.6rem;
  white-space: nowrap;
`;

// Flags an asset whose caption or alternative text is empty — mirrors the
// per-field warning shown in the details drawer. Pushed to the far end of the
// name cell (shrink 0 so a long name never crowds it out).
const MetadataWarning = styled(WarningCircle)`
  flex-shrink: 0;
  width: 1.6rem;
  height: 1.6rem;

  path {
    fill: ${({ theme }) => theme.colors.warning500};
  }
`;

// The asset filename is its own interactive element: clicking it opens the
// details drawer instead of selecting the row.
const NameButton = styled.button`
  display: inline-flex;
  max-width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

// Shields the row from its own controls (checkbox, "..." trigger) without
// severing propagation for the menu's portaled content — those events are React
// children of the cell but not DOM descendants, and Radix needs them to reach
// `document` to dismiss its layers.
const stopRowEvent = (e: React.SyntheticEvent) => {
  if (isEventFromWithin(e)) {
    e.stopPropagation();
  }
};

interface AssetPreviewCellProps {
  asset: File;
}

const AssetPreviewCell = ({ asset }: AssetPreviewCellProps) => {
  const { ext, mime } = asset;

  const DocIcon = getAssetIcon(mime, ext);

  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      borderRadius="4px"
      color="neutral500"
      width="3.2rem"
      height="3.2rem"
      shrink={0}
    >
      <DocIcon width={20} height={20} />
    </Flex>
  );
};

interface AssetRowProps {
  asset: File;
  orderedItemKeys: ItemKey[];
  onAssetItemClick: (assetId: number) => void;
}

const AssetRow = ({ asset, orderedItemKeys, onAssetItemClick }: AssetRowProps) => {
  const isDesktop = useIsDesktop();
  const { formatDate, formatMessage } = useIntl();
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const { attributes, listeners, setNodeRef, isDragging, dragData } = useFileDraggable(asset);
  const { isSelected, toggle, selectRange } = useAssetSelection();
  const { canUpdate } = useMediaLibraryPermissions();
  const busyMessage = useBusyAssetsOptional()?.getBusyMessage(asset.id) ?? null;

  const key = assetKey(asset.id);
  const selected = isSelected(key);

  // Caption and alternative text apply to every file type — same "empty =
  // falsy" rule as the drawer's per-field warning.
  const isMetadataMissing = !asset.caption || !asset.alternativeText;
  const metadataMissingLabel = formatMessage({
    id: getTranslationKey('list.table.row.metadata-missing'),
    defaultMessage: 'This asset is missing metadata (caption or alternative text).',
  });

  // Plain click opens the asset details; pointer selection lives on the
  // checkbox only. Modifier clicks keep the selection semantics: shift selects
  // a range, cmd/ctrl toggles.
  //
  // The containment guard on this and the handler below is what keeps the
  // actions menu's portaled dialogs — React children of this row — from
  // opening the details drawer or toggling the selection.
  const handleRowClick = (e: React.MouseEvent) => {
    if (!isEventFromWithin(e)) {
      return;
    }

    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else if (e.metaKey || e.ctrlKey) {
      toggle(key);
    } else {
      onAssetItemClick(asset.id);
    }
  };

  // Desktop: Space toggles selection (additive), Enter opens the details drawer.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEventFromWithin(e)) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onAssetItemClick(asset.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAssetItemClick(asset.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else {
      toggle(key);
    }
  };

  return (
    <StyledTr
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      $isDragging={isDragging}
      $isMovePending={isMovePending}
      $isBusy={busyMessage !== null}
      $isSelected={selected}
      tabIndex={0}
      role="row"
      onDragStart={(e) => e.preventDefault()}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(e: React.PointerEvent) => {
        if (isEventFromWithin(e)) {
          listeners?.onPointerDown?.(e);
        }
      }}
    >
      {/* No checkbox without the update permission (nothing selectable can be
          acted on). Shown at every viewport width otherwise. */}
      {canUpdate && (
        <CheckboxTd onClick={stopRowEvent} onKeyDown={stopRowEvent}>
          <Flex>
            <Checkbox
              checked={selected}
              onClick={handleCheckboxClick}
              aria-label={formatMessage(
                {
                  id: getTranslationKey('list.table.row.select'),
                  defaultMessage: 'Select {name}',
                },
                { name: asset.name }
              )}
            />
          </Flex>
        </CheckboxTd>
      )}
      <NameTd>
        <Flex alignItems="center" justifyContent="space-between" gap={2} minWidth={0}>
          <Flex gap={3} alignItems="center" minWidth={0}>
            {/* The row is dimmed and inert while busy; the spinner in place of the
                thumbnail is what says so positively. Its label carries the reason
                to screen readers — the row itself has no other announcement. */}
            {busyMessage !== null ? (
              <Flex justifyContent="center" width="3.2rem" height="3.2rem">
                <Loader small>{busyMessage}</Loader>
              </Flex>
            ) : (
              <AssetPreviewCell asset={asset} />
            )}
            <Flex direction="column" alignItems="flex-start" minWidth={0}>
              <NameButton type="button" onClick={handleNameClick}>
                <TruncatedText textColor="neutral800" fontWeight="semiBold">
                  {asset.name}
                </TruncatedText>
              </NameButton>
              {!isDesktop && (
                <Typography textColor="neutral600" variant="pi">
                  {asset.size ? formatBytes(asset.size, 1) : '-'}
                </Typography>
              )}
            </Flex>
          </Flex>
          {isMetadataMissing && (
            <Tooltip label={metadataMissingLabel}>
              <MetadataWarning aria-label={metadataMissingLabel} role="img" />
            </Tooltip>
          )}
        </Flex>
      </NameTd>
      {isDesktop && (
        <>
          <HugTd>
            <Typography textColor="neutral600">
              {asset.createdAt ? formatDate(new Date(asset.createdAt), { dateStyle: 'long' }) : '-'}
            </Typography>
          </HugTd>
          <HugTd>
            <Typography textColor="neutral600">
              {asset.updatedAt ? formatDate(new Date(asset.updatedAt), { dateStyle: 'long' }) : '-'}
            </Typography>
          </HugTd>
          <HugTd>
            <Typography textColor="neutral600">
              {asset.size ? formatBytes(asset.size, 1) : '-'}
            </Typography>
          </HugTd>
        </>
      )}
      {/* The row owns click, Enter and Space; none of them should reach it from
          the menu trigger (Enter would open the details drawer). */}
      <StyledTd onClick={stopRowEvent} onKeyDown={stopRowEvent} onPointerDown={stopRowEvent}>
        <Flex justifyContent="flex-end">
          <AssetActionsMenu asset={asset} dragData={dragData} />
        </Flex>
      </StyledTd>
    </StyledTr>
  );
};

const FolderTr = styled(StyledTr)`
  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }
`;

interface FolderRowProps {
  folder: Folder;
  orderedItemKeys: ItemKey[];
}

const FolderRow = ({ folder, orderedItemKeys }: FolderRowProps) => {
  const isDesktop = useIsDesktop();
  const { formatDate, formatMessage } = useIntl();
  const { navigateToFolder } = useFolderNavigation();
  const { isSelected, toggle, selectRange } = useAssetSelection();
  const { canUpdate } = useMediaLibraryPermissions();
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const {
    dragData,
    draggable: { attributes, listeners, setNodeRef: setDragRef, isDragging },
    droppable: { setNodeRef: setDropRef },
    showValidDropHighlight,
    showInvalidDropCursor,
  } = useFolderDraggableDroppable(folder);

  const key = folderKey(folder.id);

  // Folders share the selection mechanism with assets. Only the plain-click
  // semantic differs: it navigates into the folder instead of selecting it.
  //
  // The containment guard on this and the handlers below is what keeps the
  // actions menu's portaled dialogs — React children of this row — from
  // navigating into the folder or starting a drag.
  const handleRowClick = (e: React.MouseEvent) => {
    if (!isEventFromWithin(e)) {
      return;
    }

    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else if (e.metaKey || e.ctrlKey) {
      toggle(key);
    } else {
      navigateToFolder(folder);
    }
  };

  // Enter navigates into the folder, Space toggles selection (same as assets).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEventFromWithin(e)) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      navigateToFolder(folder);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else {
      toggle(key);
    }
  };

  return (
    <FolderTr
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...attributes}
      {...listeners}
      $isDragging={isDragging}
      $isMovePending={isMovePending}
      $isValidDropTarget={showValidDropHighlight}
      $isInvalidDropTarget={showInvalidDropCursor}
      $isSelected={isSelected(key)}
      tabIndex={0}
      role="row"
      onDragStart={(e: React.DragEvent) => {
        if (isEventFromWithin(e)) {
          e.preventDefault();
        }
      }}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(e: React.PointerEvent) => {
        if (isEventFromWithin(e)) {
          listeners?.onPointerDown?.(e);
        }
      }}
    >
      {canUpdate && (
        <CheckboxTd onClick={stopRowEvent} onKeyDown={stopRowEvent}>
          <Flex>
            <Checkbox
              checked={isSelected(key)}
              onClick={handleCheckboxClick}
              aria-label={formatMessage(
                {
                  id: getTranslationKey('list.table.row.select'),
                  defaultMessage: 'Select {name}',
                },
                { name: folder.name }
              )}
            />
          </Flex>
        </CheckboxTd>
      )}
      <NameTd>
        <Flex gap={3} alignItems="center" minWidth={0}>
          <Flex
            justifyContent="center"
            alignItems="center"
            borderRadius="4px"
            color="neutral600"
            width="3.2rem"
            height="3.2rem"
            shrink={0}
          >
            <FolderIcon width={20} height={20} />
          </Flex>
          <TruncatedText textColor="neutral800" fontWeight="semiBold">
            {folder.name}
          </TruncatedText>
        </Flex>
      </NameTd>
      {isDesktop && (
        <>
          <HugTd>
            <Typography textColor="neutral600">
              {folder.createdAt
                ? formatDate(new Date(folder.createdAt), { dateStyle: 'long' })
                : '-'}
            </Typography>
          </HugTd>
          <HugTd>
            <Typography textColor="neutral600">
              {folder.updatedAt
                ? formatDate(new Date(folder.updatedAt), { dateStyle: 'long' })
                : '-'}
            </Typography>
          </HugTd>
          <HugTd>
            <Typography textColor="neutral600">-</Typography>
          </HugTd>
        </>
      )}
      {/* The row owns click, Enter and Space; none of them should reach it from
          the menu trigger (Enter would navigate into the folder). */}
      <StyledTd onClick={stopRowEvent} onKeyDown={stopRowEvent} onPointerDown={stopRowEvent}>
        <Flex justifyContent="flex-end">
          <FolderActionsMenu folder={folder} dragData={dragData} />
        </Flex>
      </StyledTd>
    </FolderTr>
  );
};

interface AssetsTableProps {
  assets: File[];
  folders?: Folder[];
  /**
   * When set ("Folders: Mixed with files"), rows render in this interleaved
   * order instead of folders-first. Range selection follows the same order.
   */
  mixedItems?: MixedItem[] | null;
  /** Keys of the rendered rows, in render order. Owned by the view. */
  renderedKeys?: ItemKey[];
  onAssetItemClick: (assetId: number) => void;
}

export const AssetsTable = ({
  assets,
  folders = [],
  mixedItems = null,
  renderedKeys,
  onAssetItemClick,
}: AssetsTableProps) => {
  const isDesktop = useIsDesktop();
  const { formatMessage } = useIntl();
  const { selectedKeys, selectAll, clear } = useAssetSelection();
  const { canUpdate } = useMediaLibraryPermissions();
  const { trackUsage } = useTracking();

  // Below the desktop breakpoint only the name (and actions) column is kept —
  // the date/size columns don't fit; size moves under the name as a subtitle.
  const visibleHeaders = isDesktop
    ? TABLE_HEADERS
    : TABLE_HEADERS.filter((h) => h.name === 'name' || h.name === 'actions');

  // The checkbox column is a dedicated structural column (not part of
  // TABLE_HEADERS). Hidden only without the update permission — every bulk
  // action needs `assets.update`, so a read-only user has nothing to select for.
  const showCheckboxColumn = canUpdate;
  const colCount = visibleHeaders.length + (showCheckboxColumn ? 1 : 0);

  const totalRows = folders.length + assets.length;

  // Render order — folders first by default, or the interleaved mixed order.
  // Range selection follows it.
  const orderedItemKeys: ItemKey[] =
    renderedKeys ?? buildRenderedKeys({ folders, assets, mixedItems });
  const { allSelected, isIndeterminate } = getSelectAllState(selectedKeys, orderedItemKeys);

  const handleSelectAll = () => {
    if (allSelected) {
      clear();
    } else {
      trackUsage('didSelectAllMediaLibraryElements');
      selectAll(orderedItemKeys);
    }
  };

  // The empty state is owned by the page (`AssetsView` renders `EmptyState`) — an
  // empty table renders nothing at all, not headers over an empty body.
  if (totalRows === 0) {
    return null;
  }

  return (
    <StyledTable colCount={colCount} rowCount={(mixedItems ? mixedItems.length : totalRows) + 1}>
      <StyledThead>
        <RawTr>
          {showCheckboxColumn && (
            <CheckboxTh>
              <Flex>
                <Checkbox
                  checked={isIndeterminate ? 'indeterminate' : allSelected}
                  disabled={orderedItemKeys.length === 0}
                  onCheckedChange={handleSelectAll}
                  aria-label={formatMessage({
                    id: getTranslationKey('list.table.header.select-all'),
                    defaultMessage: 'Select all',
                  })}
                />
              </Flex>
            </CheckboxTh>
          )}
          {visibleHeaders.map((header) => {
            const tableHeaderLabel = formatMessage(header.label);
            const isVisuallyHidden = 'isVisuallyHidden' in header && header.isVisuallyHidden;

            if (isVisuallyHidden) {
              return (
                <StyledTh key={header.name} $flex={header.name === 'name'}>
                  <VisuallyHidden>
                    {formatMessage({
                      id: getTranslationKey('table.header.actions'),
                      defaultMessage: 'actions',
                    })}
                  </VisuallyHidden>
                </StyledTh>
              );
            }

            return (
              <StyledTh key={header.name} $flex={header.name === 'name'}>
                <Typography textColor="neutral600" variant="sigma">
                  {tableHeaderLabel}
                </Typography>
              </StyledTh>
            );
          })}
        </RawTr>
      </StyledThead>
      <RawTbody>
        {mixedItems?.map((item) =>
          item.kind === 'folder' ? (
            <FolderRow
              key={`folder-${item.folder.id}`}
              folder={item.folder}
              orderedItemKeys={orderedItemKeys}
            />
          ) : (
            <AssetRow
              key={item.asset.id}
              asset={item.asset}
              orderedItemKeys={orderedItemKeys}
              onAssetItemClick={onAssetItemClick}
            />
          )
        )}
        {!mixedItems &&
          folders.map((folder) => (
            <FolderRow
              key={`folder-${folder.id}`}
              folder={folder}
              orderedItemKeys={orderedItemKeys}
            />
          ))}
        {!mixedItems &&
          assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              orderedItemKeys={orderedItemKeys}
              onAssetItemClick={onAssetItemClick}
            />
          ))}
      </RawTbody>
    </StyledTable>
  );
};
