import { Box, Flex, Typography } from '@strapi/design-system';
import { Lock } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';

import { SpaceChipColumn } from './SpaceChipColumn';
import { SpaceVisibilityField } from './SpaceVisibilityField';

import type { WorkspaceAccess } from '../utils/workspaceAccess';

interface WorkspacesBindingCardProps {
  value: unknown;
  onChange: (value: string[]) => void;
  disabled: boolean;
  hint: string;
  /** From a sub-workspace: what the server said about editing this resource here. */
  access?: WorkspaceAccess;
}

/**
 * The "Workspaces" card shared by the workspace-bound settings forms (roles,
 * API tokens, users). From the **default** workspace it edits the binding —
 * that's the management hub. From a sub-workspace it only says when the
 * resource is shared with other workspaces (and therefore read-only here);
 * nothing is shown for a resource exclusively bound to the active workspace.
 */
export const WorkspacesBindingCard = ({
  value,
  onChange,
  disabled,
  hint,
  access,
}: WorkspacesBindingCardProps) => {
  const { formatMessage } = useIntl();

  if (getCurrentSpaceSlug() !== DEFAULT_SPACE_SLUG) {
    return access?.readOnly ? <LockedWorkspacesCard access={access} /> : null;
  }

  if (disabled) {
    return null;
  }

  const slugs = Array.isArray(value) ? (value as string[]) : [];

  return (
    <Box shadow="filterShadow" hasRadius background="neutral0" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: getTranslation('settings.title'),
            defaultMessage: 'Workspaces',
          })}
        </Typography>
        <SpaceVisibilityField value={slugs} onChange={onChange} hint={hint} />
      </Flex>
    </Box>
  );
};

export const LockedWorkspacesCard = ({ access }: { access: WorkspaceAccess }) => {
  const { formatMessage } = useIntl();

  return (
    <Box shadow="filterShadow" hasRadius background="neutral0" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Flex gap={2} alignItems="center">
          <Lock fill="neutral500" />
          <Typography variant="delta" tag="h2">
            {formatMessage({
              id: getTranslation('settings.title'),
              defaultMessage: 'Workspaces',
            })}
          </Typography>
        </Flex>
        <SpaceChipColumn value={access.boundSlugs} />
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslation(
              access.reason === 'platform-wide'
                ? 'binding.readOnly.platformWide'
                : 'binding.readOnly.multiBound'
            ),
            defaultMessage:
              access.reason === 'platform-wide'
                ? 'Shared with every workspace — editable from the Default workspace only.'
                : 'Shared with other workspaces — editable from the Default workspace only.',
          })}
        </Typography>
      </Flex>
    </Box>
  );
};

/** Maps a fetched row (role, token…) to the `spaces` form value (slugs). */
export const getWorkspacesBindingInitialValue = (row: unknown): string[] => {
  const spaces = (row as { spaces?: unknown })?.spaces;
  return Array.isArray(spaces) ? (spaces as string[]) : [];
};
