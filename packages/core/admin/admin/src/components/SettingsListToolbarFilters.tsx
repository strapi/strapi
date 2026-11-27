import * as React from 'react';

import { Box, Flex, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  deepEncodeQueryValues,
  useQueryParams,
  withEncodedUserParams,
} from '../hooks/useQueryParams';
import {
  resolveLabel,
  type SettingsListToolbarFilter,
  type SettingsListToolbarFilterProps,
} from '../hooks/useSettingsListExtensions';

import type { MessageDescriptor } from 'react-intl';

type PluginsQuery = Record<string, Record<string, unknown>>;

interface ListQuery {
  plugins?: PluginsQuery;
  page?: unknown;
  filters?: unknown;
  _q?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/* -------------------------------------------------------------------------------------------------
 * SettingsListToolbarFilters
 * -----------------------------------------------------------------------------------------------*/

const SettingsListToolbarFilters = ({ filters }: { filters: SettingsListToolbarFilter[] }) => {
  const [{ query }, setQuery] = useQueryParams<ListQuery>();
  const plugins: PluginsQuery = isRecord(query.plugins) ? query.plugins : {};

  const handleChange =
    ({ pluginId, name }: SettingsListToolbarFilter): SettingsListToolbarFilterProps['onChange'] =>
    (value, { replace = false } = {}) => {
      const { [name]: _previous, ...others } = isRecord(plugins[pluginId]) ? plugins[pluginId] : {};
      const pluginValues = value === '' ? others : { ...others, [name]: value };
      const { [pluginId]: _plugin, ...otherPlugins } = plugins;

      setQuery(
        withEncodedUserParams(query, {
          plugins: deepEncodeQueryValues(
            Object.keys(pluginValues).length > 0
              ? { ...otherPlugins, [pluginId]: pluginValues }
              : otherPlugins
          ),
          // Other rows: start again from the first page
          ...(query.page === undefined ? {} : { page: 1 }),
        }),
        'push',
        replace
      );
    };

  return (
    // On small screens the filters share a full-width row, like the search input above them
    <Flex gap={2} width={{ initial: '100%', medium: 'auto' }}>
      {filters.map((filter) => {
        const { Component, pluginId, name } = filter;
        const value = plugins[pluginId]?.[name];

        return (
          <Box
            key={`${pluginId}.${name}`}
            flex={{ initial: '1 1 0', medium: '0 0 auto' }}
            minWidth={{ initial: 0, medium: '16rem' }}
          >
            <Component
              value={typeof value === 'string' ? value : ''}
              onChange={handleChange(filter)}
            />
          </Box>
        );
      })}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SettingsListToolbarSelect
 * -----------------------------------------------------------------------------------------------*/

interface SettingsListToolbarSelectOption {
  value: string;
  label: string | MessageDescriptor;
}

interface SettingsListToolbarSelectProps extends SettingsListToolbarFilterProps {
  label: string | MessageDescriptor;
  /** The option that clears the filter, e.g. "All spaces" */
  placeholder: string | MessageDescriptor;
  options: SettingsListToolbarSelectOption[];
  /** While the options load, a value from the URL is kept. Once loaded, a value no option has is cleared */
  isLoading?: boolean;
}

const SettingsListToolbarSelect = ({
  label,
  placeholder,
  options,
  isLoading = false,
  value,
  onChange,
}: SettingsListToolbarSelectProps) => {
  const { formatMessage } = useIntl();
  const isUnknownValue = value !== '' && !options.some((option) => option.value === value);

  React.useEffect(() => {
    if (!isLoading && isUnknownValue) {
      onChange('', { replace: true });
    }
  }, [isLoading, isUnknownValue, onChange]);

  return (
    <SingleSelect
      size="S"
      aria-label={resolveLabel(label, formatMessage)}
      loading={isLoading}
      value={value}
      onChange={(next) => onChange(String(next))}
    >
      {/* While the options load, "All" would read as no filter applied */}
      {!isUnknownValue && (
        <SingleSelectOption value="">{resolveLabel(placeholder, formatMessage)}</SingleSelectOption>
      )}
      {options.map((option) => (
        <SingleSelectOption key={option.value} value={option.value}>
          {resolveLabel(option.label, formatMessage)}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

export { SettingsListToolbarFilters, SettingsListToolbarSelect };
export type { SettingsListToolbarSelectOption, SettingsListToolbarSelectProps };
