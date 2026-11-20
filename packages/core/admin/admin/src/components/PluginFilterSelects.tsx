import { Box, Flex, SingleSelect, SingleSelectOption } from '@strapi/design-system';

import {
  deepEncodeQueryValues,
  useQueryParams,
  withEncodedUserParams,
} from '../hooks/useQueryParams';

import type { SettingsListSelectFilter } from '../hooks/useSettingsListExtensions';

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
          <Box
            key={`${select.pluginId}.${select.name}`}
            flex={{ initial: '1 1 0', medium: '0 0 auto' }}
            minWidth={{ initial: 0, medium: '16rem' }}
          >
            <SingleSelect
              size="S"
              aria-label={select.label}
              value={typeof value === 'string' ? value : ''}
              onChange={(next) => handleChange(select)(String(next))}
            >
              <SingleSelectOption value="">{select.placeholder}</SingleSelectOption>
              {select.options.map((option) => (
                <SingleSelectOption key={option.value} value={option.value}>
                  {option.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        );
      })}
    </Flex>
  );
};

export { PluginFilterSelects };
