import { useIsMobile } from '@strapi/admin/strapi-admin';
import {
  Checkbox,
  Flex,
  IconButton,
  RawTable,
  RawTbody,
  RawTd,
  RawTh,
  RawThead,
  RawTr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Folder as FolderIcon, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, css } from 'styled-components';

import { formatBytes } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';
import { TABLE_HEADERS } from '../constants';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { type MixedItem } from '../utils/mergeMixedList';
import { assetKey, folderKey, getSelectAllState, type ItemKey } from '../utils/selection';

import { useAssetsDndOptional } from './Dnd/AssetsDndProvider';
import { useFileDraggable, useFolderDraggableDroppable } from './Dnd/useAssetDnd';

import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

const StyledTable = styled(RawTable)`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: 4px;
  overflow: hidden;
`;

const StyledThead = styled(RawThead)`
  background: ${({ theme }) => theme.colors.neutral100};

  tr {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
`;

const StyledTh = styled(RawTh)`
  height: 40px;
  padding: 0 ${({ theme }) => theme.spaces[4]};
  text-align: left;
`;

const StyledTd = styled(RawTd)`
  padding: 0 ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledTr = styled.tr<{
  $isDragging?: boolean;
  $isMovePending?: boolean;
  $isValidDropTarget?: boolean;
  $isInvalidDropTarget?: boolean;
  $isSelected?: boolean;
}>`
  height: 48px;
  user-select: none;
  background: ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.primary100 : theme.colors.neutral0};
  cursor: ${({ $isMovePending, $isInvalidDropTarget }) => {
    if ($isMovePending) {
      return 'wait';
    }

    return $isInvalidDropTarget ? 'not-allowed' : 'pointer';
  }};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  pointer-events: ${({ $isMovePending }) => ($isMovePending ? 'none' : 'auto')};

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

// Leading checkbox column. Narrow + centred so the control sits flush against the
// row's left edge.
const CheckboxTd = styled(StyledTd)`
  width: 1%;
  white-space: nowrap;
`;

const CheckboxTh = styled(StyledTh)`
  width: 1%;
  white-space: nowrap;
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

const stopRowEvent = (e: React.SyntheticEvent) => {
  e.stopPropagation();
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
  const isMobile = useIsMobile();
  const { formatDate, formatMessage } = useIntl();
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const { attributes, listeners, setNodeRef, isDragging } = useFileDraggable(asset);
  const { isSelected, toggle, selectOnly, selectRange } = useAssetSelection();

  const key = assetKey(asset.id);
  const selected = isSelected(key);

  // Click semantics: plain click selects one; cmd/ctrl toggles; shift selects a contiguous
  // range (anchor → target), replacing the current selection.
  const handleRowClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else if (e.metaKey || e.ctrlKey) {
      toggle(key);
    } else {
      selectOnly(key);
    }
  };

  // Desktop: Space toggles selection (additive), Enter opens the details drawer.
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      $isSelected={selected}
      tabIndex={0}
      role="row"
      onDragStart={(e) => e.preventDefault()}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      {/* TODO:? no checkbox column on mobile — multi-select on mobile is deferred. */}
      {!isMobile && (
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
      <StyledTd>
        <Flex gap={3} alignItems="center">
          <AssetPreviewCell asset={asset} />
          <Flex direction="column" alignItems="flex-start" minWidth={0}>
            <NameButton type="button" onClick={handleNameClick}>
              <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
                {asset.name}
              </Typography>
            </NameButton>
            {isMobile && (
              <Typography textColor="neutral600" variant="pi">
                {asset.size ? formatBytes(asset.size, 1) : '-'}
              </Typography>
            )}
          </Flex>
        </Flex>
      </StyledTd>
      {!isMobile && (
        <>
          <StyledTd>
            <Typography textColor="neutral600">
              {asset.createdAt ? formatDate(new Date(asset.createdAt), { dateStyle: 'long' }) : '-'}
            </Typography>
          </StyledTd>
          <StyledTd>
            <Typography textColor="neutral600">
              {asset.updatedAt ? formatDate(new Date(asset.updatedAt), { dateStyle: 'long' }) : '-'}
            </Typography>
          </StyledTd>
          <StyledTd>
            <Typography textColor="neutral600">
              {asset.size ? formatBytes(asset.size, 1) : '-'}
            </Typography>
          </StyledTd>
        </>
      )}
      <StyledTd>
        <Flex justifyContent="flex-end">
          <IconButton
            label={formatMessage({
              id: getTranslationKey('control-card.more-actions'),
              defaultMessage: 'More actions',
            })}
            variant="ghost"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <More />
          </IconButton>
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
  const isMobile = useIsMobile();
  const { formatDate, formatMessage } = useIntl();
  const { navigateToFolder } = useFolderNavigation();
  const { isSelected, toggle, selectRange } = useAssetSelection();
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const {
    draggable: { attributes, listeners, setNodeRef: setDragRef, isDragging },
    droppable: { setNodeRef: setDropRef },
    showValidDropHighlight,
    showInvalidDropCursor,
  } = useFolderDraggableDroppable(folder);

  const key = folderKey(folder.id);

  // Folders share the selection mechanism with assets. Only the plain-click
  // semantic differs: it navigates into the folder instead of selecting it.
  const handleRowClick = (e: React.MouseEvent) => {
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
      onDragStart={(e) => e.preventDefault()}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
    >
      {!isMobile && (
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
      <StyledTd>
        <Flex gap={3} alignItems="center">
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
          <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
            {folder.name}
          </Typography>
        </Flex>
      </StyledTd>
      {!isMobile && (
        <>
          <StyledTd>
            <Typography textColor="neutral600">
              {folder.createdAt
                ? formatDate(new Date(folder.createdAt), { dateStyle: 'long' })
                : '-'}
            </Typography>
          </StyledTd>
          <StyledTd>
            <Typography textColor="neutral600">
              {folder.updatedAt
                ? formatDate(new Date(folder.updatedAt), { dateStyle: 'long' })
                : '-'}
            </Typography>
          </StyledTd>
          <StyledTd>
            <Typography textColor="neutral600">-</Typography>
          </StyledTd>
        </>
      )}
      <StyledTd>
        <Flex justifyContent="flex-end">
          <IconButton
            label={formatMessage({
              id: getTranslationKey('control-card.more-actions'),
              defaultMessage: 'More actions',
            })}
            variant="ghost"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <More />
          </IconButton>
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
  onAssetItemClick: (assetId: number) => void;
}

export const AssetsTable = ({
  assets,
  folders = [],
  mixedItems = null,
  onAssetItemClick,
}: AssetsTableProps) => {
  const isMobile = useIsMobile();
  const { formatMessage } = useIntl();
  const { selectedKeys, selectAll, clear } = useAssetSelection();

  const visibleHeaders = isMobile
    ? TABLE_HEADERS.filter((h) => h.name === 'name' || h.name === 'actions')
    : TABLE_HEADERS;

  // The checkbox column is a dedicated structural column (not part of
  // TABLE_HEADERS) and is hidden on mobile.
  const showCheckboxColumn = !isMobile;
  const colCount = visibleHeaders.length + (showCheckboxColumn ? 1 : 0);

  const totalRows = folders.length + assets.length;

  // Render order — folders first by default, or the interleaved mixed order.
  // Range selection follows it.
  const orderedItemKeys: ItemKey[] = mixedItems
    ? mixedItems.map((item) =>
        item.kind === 'folder' ? folderKey(item.folder.id) : assetKey(item.asset.id)
      )
    : [
        ...folders.map((folder) => folderKey(folder.id)),
        ...assets.map((asset) => assetKey(asset.id)),
      ];
  const { allSelected, isIndeterminate } = getSelectAllState(selectedKeys, orderedItemKeys);

  const handleSelectAll = () => {
    if (allSelected) {
      clear();
    } else {
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
                <StyledTh key={header.name}>
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
              <StyledTh key={header.name}>
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
            <FolderRow key={`folder-${folder.id}`} folder={folder} orderedItemKeys={orderedItemKeys} />
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
