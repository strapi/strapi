import { useEffect, useState } from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';
import {
  Box,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

interface SpaceOption {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

interface SpaceVisibilityProps {
  intlLabel?: { id: string; defaultMessage: string };
  description?: { id: string; defaultMessage: string };
  name: string;
  onChange: (input: { target: { name: string; value: string[]; type: string } }) => void;
  value?: string[];
}

/**
 * "Workspaces" — checkbox dropdown in the Content-Type Builder's Advanced
 * settings. A content type lives in one or several workspaces: exactly one
 * checked = exclusive to that workspace; several = shared between them; all =
 * available everywhere. Stores an array of workspace slugs at
 * `pluginOptions.spaces.visibleIn`, normalized to `[]` when every workspace is
 * checked (platform-wide convention shared with the locale binding — new
 * workspaces automatically inherit platform-wide content types).
 *
 * Uses `useFetchClient` (not the RTK hook): CTB form components render outside
 * the admin's Redux provider in some flows, so a plain fetch is the safe path.
 */
export const SpaceVisibility = ({
  intlLabel,
  description,
  name,
  onChange,
  value,
}: SpaceVisibilityProps) => {
  const { formatMessage } = useIntl();
  const { get: fetchGet } = useFetchClient();
  const [spaces, setSpaces] = useState<SpaceOption[] | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchGet<SpaceOption[]>('/spaces/mine')
      .then((res) => {
        if (cancelled) return;
        setSpaces(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchGet]);

  if (!available) return null;
  if (!spaces || spaces.length === 0) return null;

  const safeValue: string[] = Array.isArray(value) ? value : [];
  // Empty stored value = available everywhere → every box checked in the UI.
  const displayedValue = safeValue.length === 0 ? spaces.map((s) => s.slug) : safeValue;

  const emit = (next: string[]) => {
    // Normalize "all selected" back to [] — the platform-wide storage form.
    const normalized = next.length === spaces.length ? [] : next;
    onChange({ target: { name, value: normalized, type: 'select' } });
  };

  const label = intlLabel
    ? formatMessage(intlLabel)
    : formatMessage({
        id: getTranslation('ctb.workspaces.label'),
        defaultMessage: 'Workspaces',
      });
  const hint = description
    ? formatMessage(description)
    : formatMessage({
        id: getTranslation('ctb.workspaces.description'),
        defaultMessage: 'One checked = exclusive to that workspace. Several = shared between them.',
      });

  return (
    <Field.Root name={name} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <MultiSelect value={displayedValue} onChange={(next) => emit(next as string[])} withTags>
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
