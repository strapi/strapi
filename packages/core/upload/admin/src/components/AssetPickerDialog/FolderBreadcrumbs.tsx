import { Breadcrumbs, Crumb, CrumbSimpleMenu, MenuItem } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetFolderStructureQuery } from '../../services/folders';
import { findFolderPath } from '../../utils/findFolderPath';
import { getTranslationKey } from '../../utils/translations';

// Past this many folders, the ones between the first and the parent collapse
// into a menu, so a deep tree doesn't wrap the trail over several lines.
const MAX_VISIBLE_FOLDERS = 3;

// `CrumbLink`'s look on a real button. `CrumbLink` only renders an anchor, and
// one without an `href` is neither announced as a button nor reachable by Tab.
const CrumbButton = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};
  color: ${({ theme }) => theme.colors.neutral600};
  font-size: ${({ theme }) => theme.fontSizes[1]};
  line-height: ${({ theme }) => theme.lineHeights[4]};
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};

  &:hover,
  &:focus-visible {
    background-color: ${({ theme }) => theme.colors.neutral200};
    color: ${({ theme }) => theme.colors.neutral700};
  }
`;

interface FolderBreadcrumbsProps {
  currentFolderId: number;
  onSelectFolder: (folderId: number | null) => void;
}

/**
 * Home › … › parent › current. Every crumb but the current folder navigates,
 * so a user deep in the tree can climb back without a sidebar.
 */
export const FolderBreadcrumbs = ({ currentFolderId, onSelectFolder }: FolderBreadcrumbsProps) => {
  const { formatMessage } = useIntl();
  const { data: folderStructure = [] } = useGetFolderStructureQuery();

  const path = findFolderPath(folderStructure, currentFolderId);
  const current = path?.at(-1);

  // The tree has not loaded yet, or no longer holds the folder (deleted
  // elsewhere — `useAssetsList` sends the list back to the root on its own).
  if (!path || !current) {
    return null;
  }

  const ancestors = path.slice(0, -1);
  const isCollapsed = path.length > MAX_VISIBLE_FOLDERS;
  const leading = isCollapsed ? ancestors.slice(0, 1) : ancestors;
  const hidden = isCollapsed ? ancestors.slice(1, -1) : [];
  const trailing = isCollapsed ? ancestors.slice(-1) : [];

  const renderLink = (folder: (typeof path)[number]) => (
    <CrumbButton key={folder.id} type="button" onClick={() => onSelectFolder(folder.id ?? null)}>
      {folder.name}
    </CrumbButton>
  );

  return (
    <Breadcrumbs
      label={formatMessage({
        id: getTranslationKey('asset-picker.breadcrumbs.label'),
        defaultMessage: 'Folder navigation',
      })}
    >
      <CrumbButton type="button" onClick={() => onSelectFolder(null)}>
        {formatMessage({ id: getTranslationKey('plugin.home'), defaultMessage: 'Home' })}
      </CrumbButton>
      {leading.map(renderLink)}
      {hidden.length > 0 && (
        <CrumbSimpleMenu
          aria-label={formatMessage({
            id: getTranslationKey('asset-picker.breadcrumbs.more'),
            defaultMessage: 'Show more folders',
          })}
          label="…"
        >
          {hidden.map((folder) => (
            <MenuItem key={folder.id} onSelect={() => onSelectFolder(folder.id ?? null)}>
              {folder.name}
            </MenuItem>
          ))}
        </CrumbSimpleMenu>
      )}
      {trailing.map(renderLink)}
      <Crumb isCurrent>{current.name}</Crumb>
    </Breadcrumbs>
  );
};
