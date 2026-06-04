import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { ChevronDown } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../../utils/translations';

import { RowButton } from './RowButton';

import type { FolderNode } from '../../../../../../../shared/contracts/folders';

/**
 * Padding step that mirrors the visual nesting of the tree. Multiplied by
 * `level` to indent deeper nodes. Kept in rem so it scales with user font
 * settings.
 */
const INDENT_PER_LEVEL_REM = 1.6;

const RotatingChevron = styled(ChevronDown)<{ $expanded: boolean }>`
  transform: rotate(${({ $expanded }) => ($expanded ? '0deg' : '-90deg')});
  transition: transform 0.2s ease;
`;

const Spacer = styled.span`
  display: inline-block;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
`;

interface FolderTreeItemProps {
  node: FolderNode;
  level: number;
  currentFolderId: number | null;
  isExpanded: (id: number) => boolean;
  onToggle: (id: number) => void;
  onSelect: (folderId: number) => void;
}

/**
 * Single row in the FolderTree. Renders the folder name and, when the node
 * has children, an expand/collapse chevron. Recurses into children when
 * expanded.
 *
 * The whole row is a `<button>` so keyboard users can land on it via Tab and
 * activate it with Enter/Space. The chevron is its own `<button>` (rendered
 * via `IconButton`) so users can expand a branch without navigating into it —
 * important for browsing without losing the current folder.
 *
 * TODO: full `role="tree"` + arrow-key treeview navigation before revamp GA
 * if an accessibility audit requires it (CMS-133 v1 is button rows only).
 */
export const FolderTreeItem = ({
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
  const expanded = hasChildren && isExpanded(id);
  const isActive = currentFolderId === id;

  return (
    <li>
      <Flex alignItems="center" paddingLeft={`${level * INDENT_PER_LEVEL_REM}rem`} gap={1}>
        {hasChildren ? (
          <IconButton
            label={formatMessage(
              {
                id: getTranslationKey(expanded ? 'sidebar.tree.collapse' : 'sidebar.tree.expand'),
                defaultMessage: expanded ? 'Collapse {name}' : 'Expand {name}',
              },
              { name }
            )}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onToggle(id);
            }}
            variant="ghost"
            withTooltip={false}
          >
            <RotatingChevron $expanded={expanded} fill="neutral500" />
          </IconButton>
        ) : (
          <Spacer aria-hidden />
        )}

        <Box flex="1" minWidth={0}>
          <RowButton
            type="button"
            $isActive={isActive}
            aria-current={isActive ? 'page' : undefined}
            aria-expanded={hasChildren ? expanded : undefined}
            onClick={() => onSelect(id)}
            data-testid={`folder-tree-node-${id}`}
            data-folder-id={id}
          >
            <Typography variant="omega" fontWeight={isActive ? 'semiBold' : 'regular'} ellipsis>
              {name}
            </Typography>
          </RowButton>
        </Box>
      </Flex>

      {expanded && (
        <Box tag="ul" margin={0} padding={0} style={{ listStyle: 'none' }}>
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
        </Box>
      )}
    </li>
  );
};
