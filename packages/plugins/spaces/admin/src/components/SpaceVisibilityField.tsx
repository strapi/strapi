import * as React from 'react';

import { Box, Field, Flex, MultiSelect, MultiSelectOption, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetMineSpacesQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';

interface SpaceVisibilityFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional label override. Defaults to "Available in spaces". */
  label?: string;
  /** Optional hint shown below the field. Defaults to a "leave empty = platform-wide" note. */
  hint?: string;
  /** Pass a CT uid when only spaces eligible for that CT should be selectable (currently unused — reserved for future per-CT filtering). */
  contentType?: string;
}

/**
 * The visibility-binding multi-select used across every settings resource that adopts
 * the per-space visibility pattern (locales today; API tokens, transfer tokens,
 * webhooks, media library config to follow).
 *
 * Behavior:
 *   - Renders nothing while the user's space list is loading or unavailable.
 *   - Hidden when fewer than two spaces exist — there's nothing to scope.
 *   - Empty selection = platform-wide (= visible in every space). The hint surfaces
 *     this convention so admins don't think they need to check all boxes.
 */
export const SpaceVisibilityField = ({
  value,
  onChange,
  label,
  hint,
  contentType,
}: SpaceVisibilityFieldProps) => {
  const { formatMessage } = useIntl();
  const { data: spaces, isLoading } = useGetMineSpacesQuery(
    contentType ? { contentType } : undefined
  );

  if (isLoading || !spaces || spaces.length < 2) {
    return null;
  }

  const resolvedLabel =
    label ??
    formatMessage({
      id: getTranslation('visibilityField.label'),
      defaultMessage: 'Available in spaces',
    });

  const resolvedHint =
    hint ??
    formatMessage({
      id: getTranslation('visibilityField.hint'),
      defaultMessage:
        'Uncheck spaces to limit visibility. With every space checked the row is platform-wide.',
    });

  // Platform-wide is stored as `value=[]` server-side, but visually we want every box
  // checked — empty boxes feel like "available in zero spaces". `displayedValue` is the
  // value the MultiSelect renders; we still propagate the *user-intended* value to the
  // parent on change so storage round-trips correctly (the server normalizes explicit-all
  // back to `[]` automatically).
  const isPlatformWide = !value || value.length === 0;
  const displayedValue = isPlatformWide ? spaces.map((s) => s.slug) : value;

  return (
    <Field.Root width="100%" hint={resolvedHint}>
      <Field.Label>{resolvedLabel}</Field.Label>
      <MultiSelect
        value={displayedValue}
        onChange={(next) => onChange(next as string[])}
        placeholder={formatMessage({
          id: getTranslation('visibilityField.placeholder'),
          defaultMessage: 'All spaces (platform-wide)',
        })}
        withTags
      >
        {spaces.map((space) => (
          <MultiSelectOption key={space.slug} value={space.slug}>
            <Flex alignItems="center" gap={2}>
              <Box
                width="8px"
                height="8px"
                borderRadius="50%"
                background={space.color ?? 'neutral300'}
                shrink={0}
              />
              <Typography variant="omega">{space.name}</Typography>
            </Flex>
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Hint />
    </Field.Root>
  );
};
