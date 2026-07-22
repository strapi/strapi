import { Flex, Typography } from '@strapi/design-system';
import { File as FileIcon, Folder as FolderIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../../utils/translations';

import type { DragItemData } from '../../../../types/dnd';

// Folder & File (@strapi/icons) share viewBox 0 0 32 32 but File's glyph is
// narrower/lighter. Rendering File a few px larger inside a fixed square box makes
// the two previews read at the same visual size without shifting the chip layout.
const FOLDER_ICON_SIZE = 20;
const FILE_ICON_SIZE = 24;
const ICON_BOX = 24;

const Chip = styled(Flex)`
  position: relative;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.primary100};
  box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  cursor: grabbing;
  max-width: 24rem;
`;

const CompositeChip = styled(Chip)`
  box-shadow:
    ${({ theme }) => theme.shadows.tableShadow},
    0 4px 0 -1px ${({ theme }) => theme.colors.primary100},
    0 4px 0 0 ${({ theme }) => theme.colors.primary200},
    0 7px 0 -1px ${({ theme }) => theme.colors.primary100},
    0 7px 0 0 ${({ theme }) => theme.colors.primary200};
`;

const CountGroup = styled(Flex)`
  align-items: center;
  gap: ${({ theme }) => theme.spaces[1]};
`;

const IconBox = styled(Flex)`
  flex-shrink: 0;
  width: ${ICON_BOX}px;
  height: ${ICON_BOX}px;
  align-items: center;
  justify-content: center;
`;

const TotalBadge = styled(Flex)`
  position: absolute;
  top: -${({ theme }) => theme.spaces[2]};
  right: -${({ theme }) => theme.spaces[2]};
  align-items: center;
  justify-content: center;
  min-width: ${({ theme }) => theme.spaces[5]};
  height: ${({ theme }) => theme.spaces[5]};
  padding: 0 ${({ theme }) => theme.spaces[1]};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.primary600};
`;

interface DragOverlayChipProps {
  items: DragItemData[];
}

export const DragOverlayChip = ({ items }: DragOverlayChipProps) => {
  const { formatMessage } = useIntl();

  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    const item = items[0];
    const isFolder = item.kind === 'folder';
    const Icon = isFolder ? FolderIcon : FileIcon;
    const size = isFolder ? FOLDER_ICON_SIZE : FILE_ICON_SIZE;

    return (
      <Chip>
        <IconBox>
          <Icon width={size} height={size} />
        </IconBox>
        <Typography textColor="neutral800" fontWeight="semiBold" ellipsis>
          {item.name}
        </Typography>
      </Chip>
    );
  }

  const folderCount = items.filter((item) => item.kind === 'folder').length;
  const fileCount = items.filter((item) => item.kind === 'file').length;
  const total = folderCount + fileCount;

  return (
    <CompositeChip gap={3}>
      {folderCount > 0 ? (
        <CountGroup>
          <IconBox>
            <FolderIcon width={FOLDER_ICON_SIZE} height={FOLDER_ICON_SIZE} />
          </IconBox>
          <Typography textColor="neutral800" fontWeight="semiBold">
            {formatMessage(
              {
                id: getTranslationKey('dnd.overlay.folders'),
                defaultMessage: '{count, plural, one {# folder} other {# folders}}',
              },
              { count: folderCount }
            )}
          </Typography>
        </CountGroup>
      ) : null}
      {fileCount > 0 ? (
        <CountGroup>
          <IconBox>
            <FileIcon width={FILE_ICON_SIZE} height={FILE_ICON_SIZE} />
          </IconBox>
          <Typography textColor="neutral800" fontWeight="semiBold">
            {formatMessage(
              {
                id: getTranslationKey('dnd.overlay.files'),
                defaultMessage: '{count, plural, one {# file} other {# files}}',
              },
              { count: fileCount }
            )}
          </Typography>
        </CountGroup>
      ) : null}
      <TotalBadge>
        <Typography textColor="neutral0" fontWeight="bold" variant="pi">
          {total}
        </Typography>
      </TotalBadge>
    </CompositeChip>
  );
};
