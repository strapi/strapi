import { useNotification } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross, Folder, Sparkle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAIAvailability } from '../../../../hooks/useAiAvailability';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';

/**
 * Floating bulk action bar for the future Media Library.
 *
 * TODO: Move / delete / create-metadata controls are styled stubs (toast on click)
 */
const Bar = styled(Flex)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[4]};
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndices.popover};
  align-items: center;
  gap: ${({ theme }) => theme.spaces[4]};
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
`;

const ActionCluster = styled(Flex)`
  margin-left: auto;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
`;

const VerticalDivider = styled(Box)`
  width: 1px;
  align-self: stretch;
  background: ${({ theme }) => theme.colors.neutral150};
`;

export const BulkActionsBar = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { isEnabled: isAiMetadataEnabled } = useAIAvailability();
  const { selectedIds, clear } = useAssetSelection();

  const count = selectedIds.size;

  const showStubNotification = (translationKey: string, defaultMessage: string) => {
    toggleNotification({
      type: 'info',
      message: formatMessage({
        id: getTranslationKey(translationKey),
        defaultMessage,
      }),
    });
  };

  if (count === 0) {
    return null;
  }

  return (
    <Bar
      tag="section"
      role="region"
      aria-label={formatMessage({
        id: getTranslationKey('list.bulk-actions.label'),
        defaultMessage: 'Bulk actions',
      })}
    >
      <Typography fontWeight="bold" textColor="neutral800">
        {formatMessage(
          {
            id: getTranslationKey('list.bulk-actions.selected-count'),
            defaultMessage: '{count, plural, =1 {# item selected} other {# items selected}}',
          },
          { count }
        )}
      </Typography>

      <ActionCluster>
        {isAiMetadataEnabled && (
          <Button
            size="S"
            startIcon={<Sparkle />}
            onClick={() =>
              showStubNotification(
                'list.bulk-actions.create-metadata-not-available',
                "Generate metadata isn't available yet"
              )
            }
          >
            {formatMessage({
              id: getTranslationKey('list.bulk-actions.create-metadata'),
              defaultMessage: 'Create metadata',
            })}
          </Button>
        )}

        <IconButton
          variant="ghost"
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.move'),
            defaultMessage: 'Move',
          })}
          onClick={() =>
            showStubNotification(
              'list.bulk-actions.move-not-available',
              "Bulk move isn't available yet"
            )
          }
        >
          {/* TODO(design): Figma move icon — no exact @strapi/icons match; using Folder */}
          <Folder />
        </IconButton>

        <IconButton
          variant="danger-light"
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.delete'),
            defaultMessage: 'Delete',
          })}
          onClick={() =>
            showStubNotification(
              'list.bulk-actions.delete-not-available',
              "Bulk delete isn't available yet"
            )
          }
        >
          <Trash />
        </IconButton>
      </ActionCluster>

      <VerticalDivider aria-hidden />

      <IconButton
        variant="ghost"
        label={formatMessage({
          id: getTranslationKey('list.bulk-actions.clear'),
          defaultMessage: 'Clear selection',
        })}
        onClick={clear}
      >
        <Cross />
      </IconButton>
    </Bar>
  );
};
