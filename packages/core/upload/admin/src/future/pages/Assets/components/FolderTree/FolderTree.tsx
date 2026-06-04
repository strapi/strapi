import { Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { Folder as FolderIcon, House } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../../utils/translations';

import { FolderTreeItem } from './FolderTreeItem';
import { RowButton } from './RowButton';
import { useExpandedFolders } from './useExpandedFolders';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SidebarNav = styled(Flex)`
  /* TODO: reconcile 25.6rem (Figma) with admin WIDTH_SIDE_NAVIGATION (23.2rem) */
  width: 25.6rem;
  background: ${({ theme }) => theme.colors.neutral0};
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const SidebarHeader = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface FolderTreeProps {
  folderStructure: FolderNode[];
  currentFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Left-rail navigation for the Media Library. Renders:
 *
 * 1. A "Media library" title
 * 2. A "Home" entry that clears the folder query param
 * 3. A "FOLDERS" section header
 * 4. The folder tree itself
 *
 * The component is presentational with respect to the URL — it asks the
 * parent to navigate via `onSelectFolder`, so the URL stays the single
 * source of truth for "which folder am I in" (see `useFolderNavigation`).
 */
export const FolderTree = ({
  folderStructure,
  currentFolderId,
  onSelectFolder,
  isLoading = false,
  isError = false,
  onRetry,
}: FolderTreeProps) => {
  const { formatMessage } = useIntl();
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

      <Flex direction="column" alignItems="stretch" gap={3} padding={3}>
        <Box>
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
        </Box>

        <Box>
          <Flex
            alignItems="center"
            gap={2}
            paddingTop={2}
            paddingLeft={2}
            paddingRight={2}
            paddingBottom={1}
          >
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
            <Flex justifyContent="center" padding={4}>
              <Loader>
                {formatMessage({
                  id: getTranslationKey('sidebar.tree.loading'),
                  defaultMessage: 'Loading folders...',
                })}
              </Loader>
            </Flex>
          ) : isError ? (
            <Flex direction="column" gap={2} paddingLeft={2} paddingRight={2}>
              <Typography variant="pi" textColor="danger600">
                {formatMessage({
                  id: getTranslationKey('sidebar.tree.error'),
                  defaultMessage: 'Could not load folders.',
                })}
              </Typography>
              {onRetry ? (
                <Button variant="tertiary" onClick={onRetry} size="S">
                  {formatMessage({
                    id: getTranslationKey('sidebar.tree.retry'),
                    defaultMessage: 'Try again',
                  })}
                </Button>
              ) : null}
            </Flex>
          ) : folderStructure.length === 0 ? (
            <Box paddingLeft={2}>
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
      </Flex>
    </SidebarNav>
  );
};
