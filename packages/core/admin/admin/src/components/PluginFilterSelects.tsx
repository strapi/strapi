import { Box, Flex, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  deepEncodeQueryValues,
  useQueryParams,
  withEncodedUserParams,
} from '../hooks/useQueryParams';
import { resolveLabel, type SettingsListSelectFilter } from '../hooks/useSettingsListExtensions';

type PluginsQuery = Record<string, Record<string, unknown>>;

interface ListQuery {
  plugins?: PluginsQuery;
  page?: unknown;
  filters?: unknown;
  _q?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const PluginFilterSelects = ({ selects }: { selects: SettingsListSelectFilter[] }) => {
  const [{ query }, setQuery] = useQueryParams<ListQuery>();
  const plugins: PluginsQuery = isRecord(query.plugins) ? query.plugins : {};

  const handleChange =
    ({ pluginId, name }: SettingsListSelectFilter) =>
    (value: string) => {
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
        })
      );
    };

  return (
    // On small screens the dropdowns share a full-width row, like the search input above them
    <Flex gap={2} width={{ initial: '100%', medium: 'auto' }}>
      {selects.map((select) => {
        const value = plugins[select.pluginId]?.[select.name];

        return (
          <PluginFilterSelect
            key={`${select.pluginId}.${select.name}`}
            select={select}
            value={typeof value === 'string' ? value : ''}
            onChange={handleChange(select)}
          />
        );
      })}
    </Flex>
  );
};

interface PluginFilterSelectProps {
  select: SettingsListSelectFilter;
  value: string;
  onChange: (value: string) => void;
}

const PluginFilterSelect = ({ select, value, onChange }: PluginFilterSelectProps) => {
  const { formatMessage } = useIntl();
  const options = select.useOptions();
  // A value from the URL stays visible, and clearable, while its option is loading or gone
  const isUnknownValue = value !== '' && !options.some((option) => option.value === value);

  return (
    <Box flex={{ initial: '1 1 0', medium: '0 0 auto' }} minWidth={{ initial: 0, medium: '16rem' }}>
      <SingleSelect
        size="S"
        aria-label={select.label}
        value={value}
        onChange={(next) => onChange(String(next))}
      >
        <SingleSelectOption value="">{select.placeholder}</SingleSelectOption>
        {isUnknownValue && <SingleSelectOption value={value}>{value}</SingleSelectOption>}
        {options.map((option) => (
          <SingleSelectOption key={option.value} value={option.value}>
            {resolveLabel(option.label, formatMessage)}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    </Box>
  );
};

export { PluginFilterSelects };
