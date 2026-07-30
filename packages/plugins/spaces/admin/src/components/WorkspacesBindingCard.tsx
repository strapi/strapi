import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';

import { SpaceVisibilityField } from './SpaceVisibilityField';

interface WorkspacesBindingCardProps {
  value: unknown;
  onChange: (value: string[]) => void;
  disabled: boolean;
  hint: string;
}

/**
 * The "Workspaces" card shared by the workspace-bound settings forms (roles,
 * API tokens). Only rendered from the **default** workspace — that's the
 * management hub for bindings; everywhere else the association is fixed and
 * the lists are already filtered server-side. Hidden for read-only forms.
 */
export const WorkspacesBindingCard = ({
  value,
  onChange,
  disabled,
  hint,
}: WorkspacesBindingCardProps) => {
  const { formatMessage } = useIntl();

  if (getCurrentSpaceSlug() !== DEFAULT_SPACE_SLUG || disabled) {
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

/** Maps a fetched row (role, token…) to the `spaces` form value (slugs). */
export const getWorkspacesBindingInitialValue = (row: unknown): string[] => {
  const spaces = (row as { spaces?: unknown })?.spaces;
  return Array.isArray(spaces) ? (spaces as string[]) : [];
};
