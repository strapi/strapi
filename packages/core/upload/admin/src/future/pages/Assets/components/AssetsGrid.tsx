import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Flex,
  Grid,
  IconButton,
  Typography,
} from '@strapi/design-system';
import { Folder as FolderIcon, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, css } from 'styled-components';

import { ASSET_TYPES } from '../../../../enums';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getAssetIcon } from '../../../utils/getAssetIcon';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { assetKey, folderKey, type ItemKey } from '../utils/selection';

import { useAssetsDndOptional } from './Dnd/AssetsDndProvider';
import { useFileDraggable, useFolderDraggableDroppable } from './Dnd/useAssetDnd';

import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

/* -------------------------------------------------------------------------------------------------
 * AssetsGrid
 * -----------------------------------------------------------------------------------------------*/

// Top-left selection checkbox overlaid on the asset preview, always visible.
const CheckboxOverlay = styled(Flex)`
  position: absolute;
  top: ${({ theme }) => theme.spaces[3]};
  left: ${({ theme }) => theme.spaces[3]};
  z-index: 1;
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
`;

const StyledCard = styled(Card)<{
  $isDragging?: boolean;
  $isMovePending?: boolean;
  $isSelected?: boolean;
}>`
  border: 1px solid
    ${({ theme, $isSelected }) => ($isSelected ? theme.colors.primary600 : theme.colors.neutral200)};
  border-radius: 8px;
  overflow: hidden;
  cursor: ${({ $isMovePending }) => ($isMovePending ? 'wait' : 'pointer')};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  pointer-events: ${({ $isMovePending }) => ($isMovePending ? 'none' : 'auto')};
  background: ${({ theme, $isSelected }) => ($isSelected ? theme.colors.primary100 : undefined)};
  /* Shift+click range selection must not highlight card text. */
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * FolderCard
 * -----------------------------------------------------------------------------------------------*/

const FoldersRow = styled(Box)`
  grid-column: 1 / -1;
`;

const StyledFolderCard = styled(Flex)<{
  $isDragging?: boolean;
  $isMovePending?: boolean;
  $isValidDropTarget?: boolean;
  $isInvalidDropTarget?: boolean;
  $isSelected?: boolean;
}>`
  width: 100%;
  user-select: none;
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`}; // 8px 12px
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]}; // 8px
  border: 1px solid
    ${({ theme, $isSelected }) => ($isSelected ? theme.colors.primary600 : theme.colors.neutral200)};
  border-radius: ${({ theme }) => theme.borderRadius};
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
  transition: background 0.2s;

  ${({ $isValidDropTarget, theme }) =>
    $isValidDropTarget &&
    css`
      background: ${theme.colors.primary100};
      border: 1px dashed ${theme.colors.primary600};
    `}

  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

const FolderIconContainer = styled(Flex)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.neutral600};
`;

const FolderName = styled(Typography)`
  flex: 1;
  min-width: 0;
`;

interface FolderCardProps {
  folder: Folder;
  orderedItemKeys: ItemKey[];
}

const FolderCard = ({ folder, orderedItemKeys }: FolderCardProps) => {
  const { formatMessage } = useIntl();
  const { navigateToFolder } = useFolderNavigation();
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const { isSelected, toggle, selectRange } = useAssetSelection();
  const {
    draggable: { attributes, listeners, setNodeRef: setDragRef, isDragging },
    droppable: { setNodeRef: setDropRef },
    showValidDropHighlight,
    showInvalidDropCursor,
  } = useFolderDraggableDroppable(folder);

  const key = folderKey(folder.id);

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  // Folders share the selection mechanism with assets (toggle, range,
  // select-all). Only the plain-click semantic differs: it navigates into the
  // folder instead of selecting it.
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else if (e.metaKey || e.ctrlKey) {
      toggle(key);
    } else {
      navigateToFolder(folder);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateToFolder(folder);
    } else if (e.key === ' ') {
      e.preventDefault();
      toggle(key);
    }
  };

  // Checkbox is the pointer path to selection; Shift extends the range.
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else {
      toggle(key);
    }
  };

  return (
    <StyledFolderCard
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      $isDragging={isDragging}
      $isMovePending={isMovePending}
      $isValidDropTarget={showValidDropHighlight}
      $isInvalidDropTarget={showInvalidDropCursor}
      $isSelected={isSelected(key)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="listitem"
      tabIndex={0}
    >
      <Flex onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}>
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
      <FolderIconContainer>
        <FolderIcon width={20} height={20} />
      </FolderIconContainer>
      <FolderName textColor="neutral800" ellipsis>
        {folder.name}
      </FolderName>
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
    </StyledFolderCard>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetPreview
 * -----------------------------------------------------------------------------------------------*/

const PreviewContainer = styled(Box)`
  position: relative;
  width: 100%;
  padding-bottom: 62.5%;
  height: 0;
  overflow: hidden;
  background: repeating-conic-gradient(
      ${({ theme }) => theme.colors.neutral100} 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
`;

const StyledImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const IconPreview = styled(Flex)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: ${({ theme }) => theme.colors.neutral500};
  background: ${({ theme }) => theme.colors.neutral100};
`;

interface AssetPreviewProps {
  asset: File;
}

const AssetPreview = ({ asset }: AssetPreviewProps) => {
  const { alternativeText, ext, formats, mime, url, isLocal, isUrlSigned } = asset;

  if (mime?.includes(ASSET_TYPES.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    if (mediaURL) {
      return (
        <PreviewContainer>
          <StyledImage
            src={mediaURL}
            alt={alternativeText || ''}
            // Only signed remote URLs need crossOrigin (cache collision with
            // the preview). Public/unsigned remote thumbnails must render
            // without a bucket CORS rule. See #26581.
            crossOrigin={!isLocal && isUrlSigned ? 'anonymous' : undefined}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </PreviewContainer>
      );
    }
  }

  const DocIcon = getAssetIcon(mime, ext);

  return (
    <PreviewContainer>
      <IconPreview justifyContent="center" alignItems="center">
        <DocIcon width={48} height={48} />
      </IconPreview>
    </PreviewContainer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetCard
 * -----------------------------------------------------------------------------------------------*/

const StyledCardHeader = styled(CardHeader)`
  position: relative;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const CardFooter = styled(Flex)`
  min-width: 0;
  width: 100%;
`;

const FileTypeIcon = styled(Flex)`
  color: ${({ theme }) => theme.colors.neutral600};
  flex-shrink: 0;
`;

const FileName = styled(Typography)`
  flex: 1;
  min-width: 0;
`;

// The asset filename is its own interactive element: clicking it opens the
// details drawer instead of selecting the card (mirrors the table view).
const NameButton = styled.button`
  display: inline-flex;
  flex: 1;
  min-width: 0;
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

interface AssetCardProps {
  asset: File;
  orderedItemKeys: ItemKey[];
  onAssetItemClick: (assetId: number) => void;
}

const AssetCard = ({ asset, orderedItemKeys, onAssetItemClick }: AssetCardProps) => {
  const { formatMessage } = useIntl();
  const TypeIcon = getAssetIcon(asset.mime, asset.ext);
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const { attributes, listeners, setNodeRef, isDragging } = useFileDraggable(asset);
  const { isSelected, toggle, selectRange } = useAssetSelection();

  const key = assetKey(asset.id);
  const selected = isSelected(key);

  // Plain click opens the asset details; pointer selection lives on the
  // checkbox only. Modifier clicks keep the selection semantics: shift selects
  // a range, cmd/ctrl toggles.
  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else if (e.metaKey || e.ctrlKey) {
      toggle(key);
    } else {
      onAssetItemClick(asset.id);
    }
  };

  // Space toggles selection (additive), Enter opens the details drawer.
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

  // Same semantics as the table's row checkbox: Shift extends the range,
  // otherwise a plain additive toggle. Never bubbles into the card click.
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      selectRange(orderedItemKeys, key);
    } else {
      toggle(key);
    }
  };

  return (
    <StyledCard
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      $isDragging={isDragging}
      $isMovePending={isMovePending}
      $isSelected={selected}
      tabIndex={0}
      role="listitem"
      onDragStart={(e) => e.preventDefault()}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <StyledCardHeader>
        <CheckboxOverlay onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}>
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
        </CheckboxOverlay>
        <AssetPreview asset={asset} />
      </StyledCardHeader>
      <CardBody>
        <CardFooter alignItems="center" gap={2}>
          <FileTypeIcon>
            <TypeIcon width={20} height={20} />
          </FileTypeIcon>
          <NameButton type="button" onClick={handleNameClick}>
            <FileName textColor="primary800" ellipsis>
              {asset.name}
            </FileName>
          </NameButton>
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
        </CardFooter>
      </CardBody>
    </StyledCard>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AssetsGrid
 * -----------------------------------------------------------------------------------------------*/

interface AssetsGridProps {
  assets: File[];
  folders?: Folder[];
  onAssetItemClick: (assetId: number) => void;
}

export const AssetsGrid = ({ assets, folders = [], onAssetItemClick }: AssetsGridProps) => {
  const totalItems = folders.length + assets.length;

  // Render order: folders always on top in the grid (mixing is table-only) —
  // range selection follows it.
  const orderedItemKeys: ItemKey[] = [
    ...folders.map((folder) => folderKey(folder.id)),
    ...assets.map((asset) => assetKey(asset.id)),
  ];

  // The empty state is owned by the page (`AssetsView` renders `EmptyState`) — an
  // empty grid renders nothing at all.
  if (totalItems === 0) {
    return null;
  }

  return (
    <Grid.Root gap={4} role="list" data-testid="assets-grid">
      {folders.length > 0 && (
        <FoldersRow>
          <Grid.Root gap={4}>
            {folders.map((folder) => (
              <Grid.Item col={3} m={4} s={6} xs={12} key={`folder-${folder.id}`}>
                <FolderCard folder={folder} orderedItemKeys={orderedItemKeys} />
              </Grid.Item>
            ))}
          </Grid.Root>
        </FoldersRow>
      )}
      {assets.map((asset) => (
        <Grid.Item
          col={3}
          m={4}
          s={6}
          xs={12}
          key={asset.id}
          direction="column"
          alignItems="stretch"
        >
          <AssetCard
            asset={asset}
            orderedItemKeys={orderedItemKeys}
            onAssetItemClick={onAssetItemClick}
          />
        </Grid.Item>
      ))}
    </Grid.Root>
  );
};
