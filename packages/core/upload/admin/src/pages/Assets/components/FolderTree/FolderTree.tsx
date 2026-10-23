import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { SubNav } from '@strapi/admin/strapi-admin';
import { Box, Flex, IconButton, Loader, Tooltip, Typography } from '@strapi/design-system';
import { ChevronDown, ChevronRight, Folder as FolderIcon, House, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { css, styled } from 'styled-components';

import { useGetFolderStructureQuery } from '../../../../services/folders';
import { findFolderPath } from '../../../../utils/findFolderPath';
import { isEventFromWithin } from '../../../../utils/isEventFromWithin';
import { getTranslationKey } from '../../../../utils/translations';
import { useAssetsDndOptional } from '../Dnd/AssetsDndProvider';
import { toFolderTreeSummaryId } from '../Dnd/dndIds';
import { useFolderTreeDroppable } from '../Dnd/useFolderTreeDroppable';

import { getCollapsedBranch, type CollapsedBranch } from './collapsedBranch';
import { FolderTreeRowMenu } from './FolderTreeRowMenu';
import { useSpringLoadedExpand } from './useSpringLoadedExpand';

import type { FolderNode } from '../../../../../../shared/contracts/folders';

/* -------------------------------------------------------------------------------------------------
 * RowButton — shared row styling aligned with admin SubNav.Link
 * -----------------------------------------------------------------------------------------------*/

const RowButton = styled.button<{
  $isActive: boolean;
  $isValidDropTarget?: boolean;
  $isInvalidDropCursor?: boolean;
  $isMovePending?: boolean;
}>`
  display: flex;
  align-items: center;
  // Matches the row's own gap, so Home — the one row whose icon sits inside
  // this button rather than beside it — puts its label on the same line as a
  // folder's.
  gap: ${({ theme }) => theme.spaces[1]};
  width: 100%;
  min-height: 3.2rem;
  // No padding of its own: the row owns the inset, so the label lines up with
  // the icon boxes instead of being pushed in by a second layer of spacing.
  padding: 0;
  border: 0;
  // The surface — hover, active, drop target — is painted by the row behind
  // this, so it spans the chevron and the actions menu too, not just the label.
  background: transparent;
  color: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.primary700 : theme.colors.neutral800};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: ${({ $isMovePending, $isInvalidDropCursor }) => {
    if ($isMovePending) {
      return 'wait';
    }

    return $isInvalidDropCursor ? 'not-allowed' : 'pointer';
  }};
  text-align: left;
  font: inherit;
  pointer-events: ${({ $isMovePending }) => ($isMovePending ? 'none' : 'auto')};

  ${({ $isValidDropTarget, theme }) =>
    $isValidDropTarget &&
    css`
      outline: 1px dashed ${theme.colors.primary600};
      outline-offset: -1px;
    `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

/**
 * Where a row sits in the tinted path an open summary row reveals: its hidden
 * folders, then the open folder's parent.
 */
type OpenPathSegment = 'start' | 'middle' | 'end';

// Squared where path rows meet, so the path reads as one block rather than a
// stack of separately highlighted rows.
const getOpenPathRadius = (segment: OpenPathSegment, radius: string) =>
  ({
    start: `${radius} ${radius} 0 0`,
    middle: '0',
    end: `0 0 ${radius} ${radius}`,
  })[segment];

const TreeRow = styled(Flex)<{
  $isActive?: boolean;
  $isValidDropTarget?: boolean;
  $isInvalidDropCursor?: boolean;
  $isMovePending?: boolean;
  $openPathSegment?: OpenPathSegment;
}>`
  cursor: ${({ $isMovePending, $isInvalidDropCursor }) => {
    if ($isMovePending) {
      return 'wait';
    }

    return $isInvalidDropCursor ? 'not-allowed' : 'default';
  }};
  pointer-events: ${({ $isMovePending }) => ($isMovePending ? 'none' : 'auto')};
  border-radius: ${({ $openPathSegment, theme }) =>
    $openPathSegment
      ? getOpenPathRadius($openPathSegment, theme.borderRadius)
      : theme.borderRadius};
  background: ${({ $isActive, $openPathSegment, theme }) => {
    if ($isActive) {
      return theme.colors.primary100;
    }

    // While a summary row is open, the path down to the open folder is tinted —
    // the folders it reveals plus the parent — so the tint reads as "on the way
    // here" and the open folder's own highlight as "here".
    return $openPathSegment ? theme.colors.neutral100 : 'transparent';
  }};

  // The whole row lights up, so pointing anywhere along it — chevron, label or
  // the actions trigger — reads as one target. A path row steps past its tint
  // rather than to primary100, which would make it look like a second open
  // folder (and, in dark mode, is the same colour as the tint).
  &:hover {
    background: ${({ $isActive, $openPathSegment, theme }) => {
      if ($isActive) {
        return theme.colors.primary100;
      }

      return $openPathSegment ? theme.colors.neutral150 : theme.colors.neutral100;
    }};
  }

  ${({ $isValidDropTarget, theme }) =>
    $isValidDropTarget &&
    css`
      background: ${theme.colors.primary100};
      outline: 1px dashed ${theme.colors.primary600};
      outline-offset: -1px;

      &:hover {
        background: ${theme.colors.primary100};
      }
    `}
`;

/* -------------------------------------------------------------------------------------------------
 * useExpandedFolders — local expand/collapse state
 * -----------------------------------------------------------------------------------------------*/

const useExpandedFolders = (folderStructure: FolderNode[], currentFolderId: number | null) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (currentFolderId == null) {
      return;
    }

    // The path ends with the current folder itself, which needs no expanding.
    const ancestors = findFolderPath(folderStructure, currentFolderId)
      ?.slice(0, -1)
      .map((folder) => folder.id)
      .filter((id): id is number => id != null);
    if (!ancestors || ancestors.length === 0) {
      return;
    }

    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestors) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [folderStructure, currentFolderId]);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandFolder = useCallback((id: number) => {
    setExpandedIds((prev) => {
      if (prev.has(id)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback((id: number) => expandedIds.has(id), [expandedIds]);

  return { isExpanded, toggleExpanded, expandFolder };
};

/* -------------------------------------------------------------------------------------------------
 * NavList — unstyled list for tree rows
 * -----------------------------------------------------------------------------------------------*/

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;

  /* Grid rather than block, and load-bearing despite rendering a single column:
     a minmax(0, 1fr) track contributes a minimum of 0, which is what stops each
     row propagating the min-content width of its own label.

     Folder names ellipsize, and text-overflow needs white-space: nowrap — so a
     label's min-content width is the entire name, and no box lays out narrower
     than its min-content. In block flow that floor travels up to the SubNav
     ScrollArea, which widens the rail and shows a horizontal scrollbar instead of
     truncating the name. Nesting makes it worse: the indent is spent before the
     label is measured, so shorter names trigger it the deeper you go.

     Measured in Chromium — dropping either declaration brings the scrollbar
     back, and neither min-width nor overflow on the row is a substitute. */
  display: grid;
  grid-template-columns: minmax(0, 1fr);
`;

/* -------------------------------------------------------------------------------------------------
 * FolderTreeItem — single tree row (internal)
 * -----------------------------------------------------------------------------------------------*/

const INDENT_PER_LEVEL_REM = 1.6;

/**
 * Deeper rows keep this level's indent, so a name never runs out of room however
 * deep the tree goes. Rows past it stay readable through their path tooltip.
 */
const MAX_VISUAL_LEVEL = 4;

export const getIndentRem = (level: number) =>
  Math.min(level, MAX_VISUAL_LEVEL) * INDENT_PER_LEVEL_REM;

/**
 * Breathing room between the row's highlight and the controls at either end.
 * Asymmetric on purpose: the chevron reads as part of the indent, while the
 * actions trigger sits closer to the edge so it stays out of the name's way.
 */
const ROW_INSET_LEFT_REM = 0.8;
const ROW_INSET_RIGHT_REM = 0.4;

/**
 * Every icon in the rail occupies the same 24px box, whether or not it is a
 * control: the chevron and the actions trigger are buttons, the home and folder
 * marks are not. Sizing the box rather than the glyph is what keeps the labels
 * on one vertical line across rows that mix the two.
 */
const IconSlot = styled(Flex)`
  width: 2.4rem;
  height: 2.4rem;
  min-width: 2.4rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`;

/**
 * A leaf's chevron is present only to keep the folder names aligned, so it
 * should read as absent. The design system's disabled state is built for real
 * controls — a filled, bordered pill — which draws more attention than the
 * enabled chevron next to it. Doubled selector to outrank that rule.
 */
const ChevronButton = styled(IconButton)`
  // Square, so it and the actions trigger read as one pair of controls.
  && {
    width: 2.4rem;
    height: 2.4rem;
    min-width: 2.4rem;
    min-height: 2.4rem;
    padding: 0.4rem;
  }

  // The row paints its own hover, so the control needs a stronger one of its own
  // to read as a separate target sitting on top of it.
  &&:hover:not([aria-disabled='true']) {
    background: ${({ theme }) => theme.colors.primary200};
  }

  &&[aria-disabled='true'] {
    background: transparent;
    border-color: transparent;
    opacity: 0.3;
  }
`;

const RotatingChevron = styled(ChevronDown)<{ $expanded: boolean }>`
  transform: rotate(${({ $expanded }) => ($expanded ? '0deg' : '-90deg')});
  transition: transform 0.2s ease;
`;

interface FolderTreeItemProps {
  node: FolderNode;
  /** Its parent's id, so the actions can validate a move against the real parent. */
  parentId: number | null;
  level: number;
  currentFolderId: number | null;
  showActiveFolder: boolean;
  isExpanded: (id: number) => boolean;
  onToggle: (id: number) => void;
  onExpand: (id: number) => void;
  onSelect: (folderId: number) => void;
  isMovePending: boolean;
  /** Root folder first, down to this folder's parent — for the path tooltip. */
  ancestorNames: string[];
  /**
   * Listed under an opened "N parent folders" row: the next folder on the path is
   * already the row below it, so it shows no chevron and no subfolders.
   */
  isHiddenAncestor?: boolean;
  /** Set while a summary row is open, on the rows of the path it reveals. */
  openPathSegment?: OpenPathSegment;
  /** Rendered in place of the subfolders while expanded — the collapsed branch. */
  subtree?: ReactNode;
}

interface FolderTreeItemInnerProps extends Omit<FolderTreeItemProps, 'node'> {
  id: number;
  name: string;
  folderChildren: FolderNode[];
}

const FolderTreeItemInner = ({
  id,
  name,
  parentId,
  folderChildren,
  level,
  currentFolderId,
  showActiveFolder,
  isExpanded,
  onToggle,
  onExpand,
  onSelect,
  isMovePending,
  ancestorNames,
  isHiddenAncestor = false,
  openPathSegment,
  subtree,
}: FolderTreeItemInnerProps) => {
  const { formatMessage } = useIntl();
  const hasChildren = folderChildren.length > 0;
  // A folder keeps its entry in the expanded set after its last subfolder is
  // moved away, so "expanded" has to mean "expanded *and* still has something to
  // show" — otherwise the chevron stays rotated on what is now a leaf.
  const isFolderExpanded = isExpanded(id) && hasChildren;
  const isActive = showActiveFolder && currentFolderId === id;
  const pathLabel = [
    formatMessage({ id: getTranslationKey('plugin.name'), defaultMessage: 'Media Library' }),
    ...ancestorNames,
    name,
  ].join(' / ');

  const {
    droppable: { setNodeRef },
    isOver,
    showValidDropHighlight,
    showInvalidDropCursor,
  } = useFolderTreeDroppable({ id, name });

  const handleExpand = useCallback(() => onExpand(id), [id, onExpand]);

  // Tree rows carry no selection, so a right-click always means "this folder" —
  // none of the list's selection rules apply here.
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const rowButtonRef = useRef<HTMLButtonElement>(null);

  useSpringLoadedExpand({
    isOver,
    canExpand: !isHiddenAncestor && hasChildren && !isFolderExpanded,
    onExpand: handleExpand,
  });

  // TODO: full `role="tree"` + arrow-key treeview navigation before revamp GA
  // if an accessibility audit requires it (v1 is button rows only).
  return (
    <li>
      <TreeRow
        ref={setNodeRef}
        data-native-context-menu
        alignItems="center"
        // Indent plus the row's own inset, so the chevron never sits flush
        // against the edge of the highlight at any depth.
        paddingLeft={`${getIndentRem(level) + ROW_INSET_LEFT_REM}rem`}
        paddingRight={`${ROW_INSET_RIGHT_REM}rem`}
        gap={1}
        $isActive={isActive}
        $openPathSegment={openPathSegment}
        $isValidDropTarget={showValidDropHighlight}
        $isInvalidDropCursor={showInvalidDropCursor}
        $isMovePending={isMovePending}
        onContextMenu={(event: React.MouseEvent) => {
          if (!isEventFromWithin(event)) {
            return;
          }

          event.preventDefault();
          setMenuPosition({ x: event.clientX, y: event.clientY });
        }}
      >
        {isHiddenAncestor ? (
          <IconSlot aria-hidden />
        ) : (
          <ChevronButton
            label={
              hasChildren
                ? formatMessage(
                    {
                      id: getTranslationKey(
                        isFolderExpanded ? 'sidebar.tree.collapse' : 'sidebar.tree.expand'
                      ),
                      defaultMessage: isFolderExpanded ? 'Collapse {name}' : 'Expand {name}',
                    },
                    { name }
                  )
                : formatMessage(
                    {
                      id: getTranslationKey('sidebar.tree.no-subfolders'),
                      defaultMessage: 'The folder {name} has no subfolders',
                    },
                    { name }
                  )
            }
            disabled={!hasChildren}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onToggle(id);
            }}
            variant="ghost"
            withTooltip={false}
            aria-expanded={hasChildren ? isFolderExpanded : undefined}
          >
            <RotatingChevron $expanded={isFolderExpanded} fill="neutral500" />
          </ChevronButton>
        )}

        <Box flex="1" minWidth={0}>
          {/* Always on, unlike a truncation-only tooltip: the path is more than
              the visible name, so it never just repeats what is on screen. */}
          <Tooltip label={pathLabel}>
            <RowButton
              ref={rowButtonRef}
              type="button"
              $isActive={isActive}
              $isValidDropTarget={showValidDropHighlight}
              $isInvalidDropCursor={showInvalidDropCursor}
              $isMovePending={isMovePending}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(id)}
              data-testid={`folder-tree-node-${id}`}
              data-folder-id={id}
            >
              <Typography ellipsis variant="omega" fontWeight={isActive ? 'semiBold' : 'regular'}>
                {name}
              </Typography>
            </RowButton>
          </Tooltip>
        </Box>

        <FolderTreeRowMenu
          folder={{ id, name }}
          parentId={parentId}
          menuPosition={menuPosition}
          returnFocusTo={rowButtonRef.current}
          onCloseMenu={() => setMenuPosition(null)}
        />
      </TreeRow>

      {hasChildren &&
        isFolderExpanded &&
        !isHiddenAncestor &&
        (subtree ?? (
          <NavList>
            {folderChildren.map((child) => (
              <FolderTreeItem
                key={child.id ?? child.name}
                node={child}
                parentId={id}
                level={level + 1}
                currentFolderId={currentFolderId}
                showActiveFolder={showActiveFolder}
                isExpanded={isExpanded}
                onToggle={onToggle}
                onExpand={onExpand}
                onSelect={onSelect}
                isMovePending={isMovePending}
                ancestorNames={[...ancestorNames, name]}
              />
            ))}
          </NavList>
        ))}
    </li>
  );
};

const FolderTreeItem = ({ node, ...props }: FolderTreeItemProps) => {
  if (node.id == null) {
    return null;
  }

  return (
    <FolderTreeItemInner
      {...props}
      id={node.id}
      name={node.name ?? ''}
      folderChildren={node.children ?? []}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * CollapsedAncestors — the "N parent folders" row of a deep branch (internal)
 * -----------------------------------------------------------------------------------------------*/

const SummaryLabel = styled(Typography)`
  font-style: italic;
`;

const SummaryChevron = styled(ChevronRight)<{ $expanded: boolean }>`
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0deg')});
  transition: transform 0.2s ease;
`;

type SharedItemProps = Pick<
  FolderTreeItemProps,
  | 'currentFolderId'
  | 'showActiveFolder'
  | 'isExpanded'
  | 'onToggle'
  | 'onExpand'
  | 'onSelect'
  | 'isMovePending'
>;

interface CollapsedBranchItemProps extends SharedItemProps {
  branch: CollapsedBranch;
}

interface CollapsedAncestorsProps extends CollapsedBranchItemProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * Stands in for the folders between a deep branch's root and the selected
 * folder's parent, and lists them in place when opened.
 */
const CollapsedAncestors = ({
  branch,
  isOpen,
  onOpenChange,
  ...itemProps
}: CollapsedAncestorsProps) => {
  const { formatMessage } = useIntl();
  const listId = useId();
  const open = useCallback(() => onOpenChange(true), [onOpenChange]);

  const rootName = branch.root.name ?? '';
  const hiddenNames = branch.hidden.map((node) => node.name ?? '');

  // Without this the hidden folders would be unreachable mid-drag, since the row
  // can't be clicked while dragging. It never resolves to a destination.
  const { setNodeRef, isOver } = useDroppable({
    id: toFolderTreeSummaryId(branch.root.id!),
    disabled: itemProps.isMovePending,
  });

  useSpringLoadedExpand({ isOver, canExpand: !isOpen, onExpand: open });

  return (
    <li>
      <TreeRow
        ref={setNodeRef}
        data-native-context-menu
        alignItems="center"
        paddingLeft={`${getIndentRem(1) + ROW_INSET_LEFT_REM}rem`}
        paddingRight={`${ROW_INSET_RIGHT_REM}rem`}
        $isInvalidDropCursor={isOver}
        $isMovePending={itemProps.isMovePending}
      >
        <Tooltip label={hiddenNames.join(' / ')}>
          <RowButton
            type="button"
            $isActive={false}
            $isInvalidDropCursor={isOver}
            $isMovePending={itemProps.isMovePending}
            aria-expanded={isOpen}
            aria-controls={isOpen ? listId : undefined}
            onClick={() => onOpenChange(!isOpen)}
            data-testid="folder-tree-hidden-ancestors"
          >
            <IconSlot>
              <More aria-hidden fill="neutral500" />
            </IconSlot>
            <Box flex="1" minWidth={0}>
              <SummaryLabel ellipsis variant="omega" textColor="neutral600">
                {formatMessage(
                  {
                    id: getTranslationKey('sidebar.tree.hidden-ancestors'),
                    defaultMessage:
                      '{count, plural, one {# parent folder} other {# parent folders}}',
                  },
                  { count: branch.hidden.length }
                )}
              </SummaryLabel>
            </Box>
            <IconSlot>
              <SummaryChevron aria-hidden $expanded={isOpen} fill="neutral500" />
            </IconSlot>
          </RowButton>
        </Tooltip>
      </TreeRow>

      {isOpen && (
        <NavList id={listId}>
          {branch.hidden.map((node, index) => (
            <FolderTreeItem
              {...itemProps}
              key={node.id ?? node.name}
              node={node}
              parentId={(index === 0 ? branch.root.id : branch.hidden[index - 1].id) ?? null}
              // All at one level: they are a list of the path, not a nested tree.
              level={2}
              ancestorNames={[rootName, ...hiddenNames.slice(0, index)]}
              isHiddenAncestor
              openPathSegment={index === 0 ? 'start' : 'middle'}
            />
          ))}
        </NavList>
      )}
    </li>
  );
};

/**
 * The root folder of a deep branch, with everything between it and the selected
 * folder's parent folded into one row. See `getCollapsedBranch`.
 */
const CollapsedBranchItem = ({ branch, ...itemProps }: CollapsedBranchItemProps) => {
  const { currentFolderId } = itemProps;
  const [isOpen, setIsOpen] = useState(false);

  // Closed again on every new selection, clicking a hidden folder included.
  // Reset during render rather than in an effect, so the list never paints open
  // for a folder it wasn't opened on.
  const [openedOn, setOpenedOn] = useState(currentFolderId);
  if (openedOn !== currentFolderId) {
    setOpenedOn(currentFolderId);
    setIsOpen(false);
  }

  const ancestorNamesOfParent = [branch.root, ...branch.hidden].map((node) => node.name ?? '');

  return (
    <FolderTreeItem
      {...itemProps}
      node={branch.root}
      parentId={null}
      level={0}
      ancestorNames={[]}
      subtree={
        <NavList>
          <CollapsedAncestors
            {...itemProps}
            branch={branch}
            isOpen={isOpen}
            onOpenChange={setIsOpen}
          />
          <FolderTreeItem
            {...itemProps}
            node={branch.parent}
            parentId={branch.hidden[branch.hidden.length - 1]?.id ?? branch.root.id ?? null}
            level={2}
            ancestorNames={ancestorNamesOfParent}
            openPathSegment={isOpen ? 'end' : undefined}
          />
        </NavList>
      }
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * FolderTree — public sidebar component
 * -----------------------------------------------------------------------------------------------*/

interface FolderTreeProps {
  currentFolderId: number | null;
  /**
   * Set to `false` while a global asset search is active: the results span the
   * whole library, so highlighting one folder would misrepresent them.
   * */
  showActiveFolder?: boolean;
  onSelectFolder: (folderId: number | null) => void;
  /** Rendered inside the sidebar, which it can listen on through `FOLDER_TREE_ROOT_SELECTOR`. */
  backgroundContextMenu?: ReactNode;
}

export const FOLDER_TREE_ROOT_SELECTOR = '[data-folder-tree-root]';

/**
 * Left-rail navigation for the Media Library. Fetches folder structure internally
 * and renders:
 *
 * 1. A "Media library" title
 * 2. A filter input that prunes the tree to matching destinations
 * 3. A "Home" entry that clears the folder query param
 * 4. A "FOLDERS" section header
 * 5. The folder tree itself
 *
 * The filter is purely local: it never touches the URL and never affects the
 * asset list, which has its own independent search in the content toolbar.
 *
 * Presentational with respect to routing — navigation is delegated to the parent
 * via `onSelectFolder` so the URL stays the single source of truth (see
 * `useFolderNavigation`).
 */
export const FolderTree = ({
  currentFolderId,
  showActiveFolder = true,
  onSelectFolder,
  backgroundContextMenu,
}: FolderTreeProps) => {
  const { formatMessage } = useIntl();
  const { data: folderStructure = [], isLoading, isError } = useGetFolderStructureQuery();
  const { isExpanded, toggleExpanded, expandFolder } = useExpandedFolders(
    folderStructure,
    currentFolderId
  );
  const { isMovePending } = useAssetsDndOptional() ?? { isMovePending: false };
  const collapsedBranch = useMemo(
    () => getCollapsedBranch(folderStructure, currentFolderId),
    [folderStructure, currentFolderId]
  );
  // A selection that folds or unfolds a branch remounts the selected row, which
  // drops focus to <body>. Whether focus was in the tree has to be read before
  // the selection, since by the time the new row renders the old one is gone.
  const restoreFocusRef = useRef(false);
  const handleSelectFolder = useCallback(
    (folderId: number) => {
      // Re-selecting the open folder renders nothing new, so a flag set here
      // would linger and pull focus back on a later, unrelated navigation.
      restoreFocusRef.current =
        folderId !== currentFolderId &&
        document.activeElement?.closest(FOLDER_TREE_ROOT_SELECTOR) != null;
      onSelectFolder(folderId);
    },
    [currentFolderId, onSelectFolder]
  );

  useEffect(() => {
    if (!restoreFocusRef.current || currentFolderId == null) {
      return;
    }

    restoreFocusRef.current = false;
    // Only take back the focus the remount dropped, never steal it from elsewhere.
    if (document.activeElement !== document.body) {
      return;
    }

    document
      .querySelector<HTMLElement>(
        `${FOLDER_TREE_ROOT_SELECTOR} [data-folder-id="${currentFolderId}"]`
      )
      ?.focus();
  }, [currentFolderId]);

  const sharedItemProps: SharedItemProps = {
    currentFolderId,
    showActiveFolder,
    isExpanded,
    onToggle: toggleExpanded,
    onExpand: expandFolder,
    onSelect: handleSelectFolder,
    isMovePending,
  };

  const isHomeActive = showActiveFolder && currentFolderId == null;
  const homeLabel = formatMessage({
    id: getTranslationKey('sidebar.home'),
    defaultMessage: 'Home',
  });

  const {
    droppable: { setNodeRef: setHomeDropRef },
    showValidDropHighlight: showHomeValidDropHighlight,
    showInvalidDropCursor: showHomeInvalidDropCursor,
  } = useFolderTreeDroppable({ id: null, name: homeLabel });

  return (
    <SubNav.Main
      data-folder-tree-root
      aria-label={formatMessage({
        id: getTranslationKey('sidebar.tree.aria-label'),
        defaultMessage: 'Media library folders',
      })}
    >
      {backgroundContextMenu}
      <SubNav.Header
        label={formatMessage({
          id: getTranslationKey('sidebar.title'),
          defaultMessage: 'Media library',
        })}
      />

      <SubNav.Content>
        <Flex direction="column" alignItems="stretch" padding={3}>
          {/* Same row wrapper as a folder, so Home highlights across its whole
              width rather than only behind the label. */}
          <TreeRow
            ref={setHomeDropRef}
            data-native-context-menu
            alignItems="center"
            // Level 0, so the indent contributes nothing — but the row's own
            // inset still applies, exactly as it does for a top-level folder.
            paddingLeft={`${ROW_INSET_LEFT_REM}rem`}
            paddingRight={`${ROW_INSET_RIGHT_REM}rem`}
            $isActive={isHomeActive}
            $isValidDropTarget={showHomeValidDropHighlight}
            $isInvalidDropCursor={showHomeInvalidDropCursor}
            $isMovePending={isMovePending}
          >
            <RowButton
              type="button"
              $isActive={isHomeActive}
              $isValidDropTarget={showHomeValidDropHighlight}
              $isInvalidDropCursor={showHomeInvalidDropCursor}
              $isMovePending={isMovePending}
              aria-current={isHomeActive ? 'page' : undefined}
              onClick={() => onSelectFolder(null)}
              data-testid="folder-tree-home"
            >
              <IconSlot>
                <House aria-hidden width="1.6rem" height="1.6rem" />
              </IconSlot>
              <Typography variant="omega" fontWeight={isHomeActive ? 'semiBold' : 'regular'}>
                {homeLabel}
              </Typography>
            </RowButton>
          </TreeRow>

          <Box marginTop={4}>
            <Flex
              alignItems="center"
              gap={1}
              paddingTop={1}
              paddingBottom={1}
              paddingLeft={2}
              paddingRight={2}
            >
              <IconSlot>
                <FolderIcon aria-hidden width="1.6rem" height="1.6rem" fill="neutral500" />
              </IconSlot>
              <Typography
                variant="sigma"
                textColor="neutral600"
                style={{ textTransform: 'uppercase' }}
              >
                {formatMessage({
                  id: getTranslationKey('sidebar.folders'),
                  defaultMessage: 'Folders',
                })}
              </Typography>
            </Flex>

            {isLoading ? (
              // TODO: revisit loading state before revamp GA
              <Flex justifyContent="center" padding={1} paddingTop={2}>
                <Loader>
                  {formatMessage({
                    id: getTranslationKey('sidebar.tree.loading'),
                    defaultMessage: 'Loading folders...',
                  })}
                </Loader>
              </Flex>
            ) : isError ? (
              // TODO: revisit error state before revamp GA
              <Box padding={1} paddingTop={2}>
                <Typography variant="pi" textColor="danger600">
                  {formatMessage({
                    id: getTranslationKey('sidebar.tree.error'),
                    defaultMessage: 'Could not load folders.',
                  })}
                </Typography>
              </Box>
            ) : folderStructure.length === 0 ? (
              // TODO: revisit empty state before revamp GA
              <Box padding={1} paddingTop={2}>
                <Typography variant="pi" textColor="neutral500">
                  {formatMessage({
                    id: getTranslationKey('sidebar.tree.empty'),
                    defaultMessage: 'No folders yet',
                  })}
                </Typography>
              </Box>
            ) : (
              <NavList>
                {folderStructure.map((node) =>
                  collapsedBranch && node.id === collapsedBranch.root.id ? (
                    <CollapsedBranchItem
                      key={node.id}
                      branch={collapsedBranch}
                      {...sharedItemProps}
                    />
                  ) : (
                    <FolderTreeItem
                      key={node.id ?? node.name}
                      node={node}
                      // Top of the tree — these sit at the library root.
                      parentId={null}
                      level={0}
                      ancestorNames={[]}
                      {...sharedItemProps}
                    />
                  )
                )}
              </NavList>
            )}
          </Box>
        </Flex>
      </SubNav.Content>
    </SubNav.Main>
  );
};
