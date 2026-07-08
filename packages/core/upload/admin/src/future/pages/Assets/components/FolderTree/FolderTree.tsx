import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Box, Flex, IconButton, Loader, Tooltip, Typography } from '@strapi/design-system';
import { ChevronDown, Folder as FolderIcon, House } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetFolderStructureQuery } from '../../../../services/folders';
import { getTranslationKey } from '../../../../utils/translations';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

/* -------------------------------------------------------------------------------------------------
 * RowButton — shared row styling aligned with admin SubNav.Link
 * -----------------------------------------------------------------------------------------------*/

const RowButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  width: 100%;
  min-height: 3.2rem;
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  border: 0;
  background: ${({ $isActive, theme }) => ($isActive ? theme.colors.primary100 : 'transparent')};
  color: ${({ $isActive, theme }) =>
    $isActive ? theme.colors.primary700 : theme.colors.neutral800};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  text-align: left;
  font: inherit;

  &:hover {
    background: ${({ $isActive, theme }) =>
      $isActive ? theme.colors.primary100 : theme.colors.neutral100};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: -2px;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * useExpandedFolders — local expand/collapse state
 * -----------------------------------------------------------------------------------------------*/

const findAncestorIds = (
  nodes: FolderNode[],
  targetId: number,
  trail: number[] = []
): number[] | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return trail;
    }

    if (node.children?.length) {
      const nextTrail = node.id != null ? [...trail, node.id] : trail;
      const found = findAncestorIds(node.children, targetId, nextTrail);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
};

const useExpandedFolders = (folderStructure: FolderNode[], currentFolderId: number | null) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (currentFolderId == null) {
      return;
    }

    const ancestors = findAncestorIds(folderStructure, currentFolderId);
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

  const isExpanded = useCallback((id: number) => expandedIds.has(id), [expandedIds]);

  return { isExpanded, toggleExpanded };
};

/* -------------------------------------------------------------------------------------------------
 * TruncatedFolderName — tooltip when the label is ellipsized
 * -----------------------------------------------------------------------------------------------*/

const TruncatedFolderName = ({ name, isActive }: { name: string; isActive: boolean }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) {
      return;
    }

    const checkTruncation = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);

    return () => observer.disconnect();
  }, [name]);

  const label = (
    <Typography
      ref={textRef}
      variant="omega"
      fontWeight={isActive ? 'semiBold' : 'regular'}
      ellipsis
    >
      {name}
    </Typography>
  );

  if (isTruncated) {
    return <Tooltip label={name}>{label}</Tooltip>;
  }

  return label;
};

/* -------------------------------------------------------------------------------------------------
 * NavList — unstyled list for tree rows
 * -----------------------------------------------------------------------------------------------*/

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

/* -------------------------------------------------------------------------------------------------
 * FolderTreeItem — single tree row (internal)
 * -----------------------------------------------------------------------------------------------*/

const INDENT_PER_LEVEL_REM = 1.6;

const RotatingChevron = styled(ChevronDown)<{ $expanded: boolean }>`
  transform: rotate(${({ $expanded }) => ($expanded ? '0deg' : '-90deg')});
  transition: transform 0.2s ease;
`;

interface FolderTreeItemProps {
  node: FolderNode;
  level: number;
  currentFolderId: number | null;
  isExpanded: (id: number) => boolean;
  onToggle: (id: number) => void;
  onSelect: (folderId: number) => void;
}

const FolderTreeItem = ({
  node,
  level,
  currentFolderId,
  isExpanded,
  onToggle,
  onSelect,
}: FolderTreeItemProps) => {
  const { formatMessage } = useIntl();

  if (node.id == null) {
    return null;
  }

  const id = node.id;
  const name = node.name ?? '';
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isFolderExpanded = isExpanded(id);
  const isActive = currentFolderId === id;

  // TODO: full `role="tree"` + arrow-key treeview navigation before revamp GA
  // if an accessibility audit requires it (v1 is button rows only).
  return (
    <li>
      <Flex alignItems="center" paddingLeft={`${level * INDENT_PER_LEVEL_REM}rem`} gap={1}>
        <IconButton
          label={formatMessage(
            {
              id: getTranslationKey(
                isFolderExpanded ? 'sidebar.tree.collapse' : 'sidebar.tree.expand'
              ),
              defaultMessage: isFolderExpanded ? 'Collapse {name}' : 'Expand {name}',
            },
            { name }
          )}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            onToggle(id);
          }}
          variant="ghost"
          withTooltip={false}
          aria-expanded={isFolderExpanded}
        >
          <RotatingChevron $expanded={isFolderExpanded} fill="neutral500" />
        </IconButton>

        <Box flex="1" minWidth={0}>
          <RowButton
            type="button"
            $isActive={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(id)}
            data-testid={`folder-tree-node-${id}`}
            data-folder-id={id}
          >
            <TruncatedFolderName name={name} isActive={isActive} />
          </RowButton>
        </Box>
      </Flex>

      {hasChildren && isFolderExpanded && (
        <NavList>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id ?? child.name}
              node={child}
              level={level + 1}
              currentFolderId={currentFolderId}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </NavList>
      )}
    </li>
  );
};

/* -------------------------------------------------------------------------------------------------
 * FolderTree — public sidebar component
 * -----------------------------------------------------------------------------------------------*/

const SidebarNav = styled(Flex)`
  /* TODO: reconcile 25.6rem (Figma) with admin WIDTH_SIDE_NAVIGATION (23.2rem) */
  width: 25.6rem;
  height: 100%;
  min-height: 100%;
  background: ${({ theme }) => theme.colors.neutral0};
  flex-shrink: 0;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const SidebarHeader = styled(Box)`
  flex-shrink: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const SidebarBody = styled(Flex)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

interface FolderTreeProps {
  currentFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
}

/**
 * Left-rail navigation for the Media Library. Fetches folder structure internally
 * and renders:
 *
 * 1. A "Media library" title
 * 2. A "Home" entry that clears the folder query param
 * 3. A "FOLDERS" section header
 * 4. The folder tree itself
 *
 * Presentational with respect to routing — navigation is delegated to the parent
 * via `onSelectFolder` so the URL stays the single source of truth (see
 * `useFolderNavigation`).
 */
export const FolderTree = ({ currentFolderId, onSelectFolder }: FolderTreeProps) => {
  const { formatMessage } = useIntl();
  const { data: folderStructure = [], isLoading, isError } = useGetFolderStructureQuery();
  const { isExpanded, toggleExpanded } = useExpandedFolders(folderStructure, currentFolderId);

  const isHomeActive = currentFolderId == null;

  return (
    <SidebarNav
      direction="column"
      alignItems="stretch"
      tag="nav"
      aria-label={formatMessage({
        id: getTranslationKey('sidebar.tree.aria-label'),
        defaultMessage: 'Media library folders',
      })}
    >
      <SidebarHeader paddingTop={4} paddingBottom={4} paddingLeft={5} paddingRight={5}>
        <Typography variant="beta" tag="h2">
          {formatMessage({
            id: getTranslationKey('sidebar.title'),
            defaultMessage: 'Media library',
          })}
        </Typography>
      </SidebarHeader>

      <SidebarBody direction="column" alignItems="stretch" gap={1} padding={3}>
        <RowButton
          type="button"
          $isActive={isHomeActive}
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={() => onSelectFolder(null)}
          data-testid="folder-tree-home"
        >
          <House aria-hidden width="1.6rem" height="1.6rem" />
          <Typography variant="omega" fontWeight={isHomeActive ? 'semiBold' : 'regular'}>
            {formatMessage({
              id: getTranslationKey('sidebar.home'),
              defaultMessage: 'Home',
            })}
          </Typography>
        </RowButton>

        <Box>
          <Flex alignItems="center" gap={1} padding={1}>
            <FolderIcon aria-hidden width="1.6rem" height="1.6rem" fill="neutral500" />
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
              {folderStructure.map((node) => (
                <FolderTreeItem
                  key={node.id ?? node.name}
                  node={node}
                  level={0}
                  currentFolderId={currentFolderId}
                  isExpanded={isExpanded}
                  onToggle={toggleExpanded}
                  onSelect={onSelectFolder}
                />
              ))}
            </NavList>
          )}
        </Box>
      </SidebarBody>
    </SidebarNav>
  );
};
