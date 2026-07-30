import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetMineSpacesQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';

const Chip = styled(Flex)<{ $color: string | null }>`
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral100};
  border-left: 3px solid ${({ $color, theme }) => $color ?? theme.colors.neutral300};
  gap: ${({ theme }) => theme.spaces[1]};
`;

interface SpaceChipColumnProps {
  /** Slugs the resource is visible in. Empty list = platform-wide. */
  value: string[];
}

/**
 * Renders the "Spaces" column for a settings resource's list table — chips of the
 * spaces a row is visible in, or a single "All spaces" badge when the list is empty
 * (platform-wide). Used in i18n's LocaleTable today; will be used for API tokens,
 * webhooks, etc. as the pattern rolls out.
 *
 * Renders nothing when fewer than two spaces exist (single-space install — nothing
 * worth showing).
 */
export const SpaceChipColumn = ({ value }: SpaceChipColumnProps) => {
  const { formatMessage } = useIntl();
  const { data: spaces, isLoading } = useGetMineSpacesQuery();

  if (isLoading || !spaces || spaces.length < 2) {
    return null;
  }

  // "All spaces" is rendered in two semantically-equivalent cases:
  //   1. `value` is empty (= platform-wide / no scoping in storage).
  //   2. `value` lists every available space — the user explicitly checked every box.
  // Showing the consolidated badge in both cases keeps the table consistent and avoids
  // a "wall of chips" when the binding is effectively no-op. (We don't normalize the
  // *stored* value here — that's a separate decision; this is presentation-only.)
  const allSelected = value && value.length > 0 && value.length === spaces.length;
  if (!value || value.length === 0 || allSelected) {
    return (
      <Chip $color={null} alignItems="center">
        <Typography variant="pi" textColor="neutral700">
          {formatMessage({
            id: getTranslation('chipColumn.allSpaces'),
            defaultMessage: 'All spaces',
          })}
        </Typography>
      </Chip>
    );
  }

  const bySlug = new Map(spaces.map((s) => [s.slug, s]));

  return (
    <Flex gap={1} wrap="wrap">
      {value.map((slug) => {
        const space = bySlug.get(slug);
        return (
          <Chip key={slug} $color={space?.color ?? null} alignItems="center">
            <Box
              width="6px"
              height="6px"
              borderRadius="50%"
              background={space?.color ?? 'neutral300'}
              shrink={0}
            />
            <Typography variant="pi" textColor="neutral700">
              {space?.name ?? slug}
            </Typography>
          </Chip>
        );
      })}
    </Flex>
  );
};
