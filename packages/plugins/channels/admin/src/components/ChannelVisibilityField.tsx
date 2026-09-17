import { useEffect, useState } from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';
import { Field, Flex, MultiSelect, MultiSelectOption, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { DEFAULT_CHANNEL_SLUG } from '../constants';
import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';

interface ChannelOption {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

interface ChannelVisibilityFieldProps {
  intlLabel?: { id: string; defaultMessage: string };
  description?: { id: string; defaultMessage: string };
  name: string;
  onChange: (input: { target: { name: string; value: string[]; type: string } }) => void;
  value?: string[];
  /** The base channel always sees everything; CT availability excludes it. */
  includeDefault?: boolean;
}

/**
 * "Visible in channels" — checkbox dropdown on a field's Advanced settings in
 * the Content-Type Builder. Stores channel slugs at
 * `pluginOptions.channels.visibleIn`, normalized to `[]` when everything is
 * checked (= visible everywhere, so new channels automatically see the field).
 *
 * Uses `useFetchClient` (not the RTK hook): CTB form components render outside
 * the admin's Redux provider in some flows (lesson from the spaces plugin).
 */
export const ChannelVisibilityField = ({
  intlLabel,
  description,
  name,
  onChange,
  value,
  includeDefault = true,
}: ChannelVisibilityFieldProps) => {
  const { formatMessage } = useIntl();
  const { get: fetchGet } = useFetchClient();
  const [channels, setChannels] = useState<ChannelOption[] | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchGet<ChannelOption[]>('/channels/mine')
      .then((res) => {
        if (cancelled) return;
        setChannels(Array.isArray(res.data) ? res.data : []);
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
  if (!channels || channels.length === 0) return null;

  const options: ChannelOption[] = includeDefault
    ? [{ id: 0, slug: DEFAULT_CHANNEL_SLUG, name: 'Default', color: null }, ...channels]
    : channels;

  const safeValue: string[] = Array.isArray(value) ? value : [];
  // Empty stored value = visible everywhere → every box checked in the UI.
  const displayedValue = safeValue.length === 0 ? options.map((option) => option.slug) : safeValue;

  const emit = (next: string[]) => {
    // Normalize "all selected" back to [] — the visible-everywhere storage form.
    const normalized = next.length === options.length ? [] : next;
    onChange({ target: { name, value: normalized, type: 'select' } });
  };

  const label = intlLabel
    ? formatMessage(intlLabel)
    : formatMessage({
        id: getTranslation('ctb.visible-in.label'),
        defaultMessage: 'Visible in channels',
      });
  const hint = description
    ? formatMessage(description)
    : formatMessage({
        id: getTranslation('ctb.visible-in.description'),
        defaultMessage:
          'The field is stripped from API responses and hidden in the admin on unchecked channels.',
      });

  return (
    <Field.Root name={name} hint={hint}>
      <Field.Label>{label}</Field.Label>
      <MultiSelect value={displayedValue} onChange={(next) => emit(next as string[])} withTags>
        {options.map((channel) => (
          <MultiSelectOption key={channel.slug} value={channel.slug}>
            <Flex alignItems="center" gap={2}>
              <ChannelDot color={channel.color} size="8px" />
              <Typography variant="omega">{channel.name}</Typography>
            </Flex>
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Hint />
    </Field.Root>
  );
};

/** CT-level "Available in channels" — same select, without the base channel. */
export const ChannelAvailabilityField = (
  props: Omit<ChannelVisibilityFieldProps, 'includeDefault'>
) => <ChannelVisibilityField {...props} includeDefault={false} />;
