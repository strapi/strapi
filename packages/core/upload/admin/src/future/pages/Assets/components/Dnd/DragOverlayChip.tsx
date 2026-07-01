import { Flex, Typography } from '@strapi/design-system';
import { File as FileIcon, Folder as FolderIcon } from '@strapi/icons';
import { styled } from 'styled-components';

import type { DragItemData } from '../../../../types/dnd';

const Chip = styled(Flex)`
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.primary100};
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  cursor: grabbing;
  max-width: 24rem;
`;

interface DragOverlayChipProps {
  item: DragItemData;
}

export const DragOverlayChip = ({ item }: DragOverlayChipProps) => {
  const Icon = item.kind === 'folder' ? FolderIcon : FileIcon;

  return (
    <Chip>
      <Icon width={20} height={20} />
      <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
        {item.name}
      </Typography>
    </Chip>
  );
};

// TODO composite overlay with folder/file counts + total badge.
