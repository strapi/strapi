import { Flex, IconButton, MenuItem, SimpleMenu, Typography } from '@strapi/design-system';
import { House, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useFolderTrail } from '../../../hooks/useFolderTrail';
import { getTranslationKey } from '../../../utils/translations';

const TAP_TARGET_SIZE = '4.4rem';
const ICON_SIZE = '1.6rem';

const TAP_TARGET = { minWidth: TAP_TARGET_SIZE, minHeight: TAP_TARGET_SIZE } as const;

const Nav = styled(Flex)`
  margin-left: calc((${ICON_SIZE} - ${TAP_TARGET_SIZE}) / 2);
`;

const Heading = styled(Typography)`
  min-width: 0;
`;

const Separator = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.neutral500};
  font-size: ${({ theme }) => theme.fontSizes[4]};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

interface FolderHeaderTitleProps {
  currentFolderId: number;
  title: string;
  onSelectFolder: (folderId: number | null) => void;
}

export const FolderHeaderTitle = ({
  currentFolderId,
  title,
  onSelectFolder,
}: FolderHeaderTitleProps) => {
  const { formatMessage } = useIntl();
  const { ancestors } = useFolderTrail(currentFolderId);

  const homeLabel = formatMessage({ id: getTranslationKey('plugin.home'), defaultMessage: 'Home' });

  return (
    <Flex alignItems="center" gap={1} minWidth={0}>
      <Nav
        tag="nav"
        alignItems="center"
        gap={1}
        shrink={0}
        aria-label={formatMessage({
          id: getTranslationKey('asset-picker.breadcrumbs.label'),
          defaultMessage: 'Folder navigation',
        })}
      >
        <IconButton
          label={homeLabel}
          variant="ghost"
          onClick={() => onSelectFolder(null)}
          {...TAP_TARGET}
        >
          <House />
        </IconButton>
        {ancestors.length > 0 && (
          <>
            <Separator aria-hidden>/</Separator>
            <SimpleMenu
              tag={IconButton}
              icon={<More />}
              variant="ghost"
              {...TAP_TARGET}
              label={formatMessage({
                id: getTranslationKey('asset-picker.breadcrumbs.more'),
                defaultMessage: 'Show more folders',
              })}
            >
              {ancestors.map((folder) => (
                <MenuItem key={folder.id} onSelect={() => onSelectFolder(folder.id ?? null)}>
                  {folder.name}
                </MenuItem>
              ))}
            </SimpleMenu>
          </>
        )}
      </Nav>
      <Separator aria-hidden>/</Separator>
      <Flex minWidth={0} paddingLeft={2}>
        <Heading variant="alpha" tag="h1" ellipsis>
          {title}
        </Heading>
      </Flex>
    </Flex>
  );
};
