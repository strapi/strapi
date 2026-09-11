import * as React from 'react';

import {
  Layouts,
  SearchInput,
  Table,
  tours,
  useQueryParams,
  useTracking,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  Menu,
  SingleSelect,
  SingleSelectOption,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  useCollator,
  useFilter,
} from '@strapi/design-system';
import { Cross, Filter, Information, Plus } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useDataManager } from '../../components/DataManager/useDataManager';
import { useFormModalNavigation } from '../../components/FormModalNavigation/useFormModalNavigation';
import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';

import { getSchemaColumns, getSchemaFilters } from './schemaRegistry';

import type { Schema } from './schemaRegistry';
import type { OpenModalCreateSchemaPayload } from '../../components/FormModalNavigation/FormModalNavigationProvider';

type TabKind = 'collectionType' | 'singleType' | 'component';

const isTabKind = (value: unknown): value is TabKind =>
  value === 'collectionType' || value === 'singleType' || value === 'component';

const ClickableRow = styled(Table.Row)`
  cursor: pointer;
`;

const isContentType = (schema: Schema): boolean => schema.modelType === 'contentType';

const hasDraftAndPublish = (schema: Schema) =>
  isContentType(schema) &&
  (schema as { options?: { draftAndPublish?: boolean } }).options?.draftAndPublish === true;

/** An option that is on reads as a word; one that is off reads as nothing. */
const OnOff = ({ on }: { on: boolean }) => {
  const { formatMessage } = useIntl();

  if (!on) {
    return (
      <Typography
        textColor="neutral400"
        aria-label={formatMessage({ id: 'global.off', defaultMessage: 'Off' })}
      >
        —
      </Typography>
    );
  }

  return (
    <Typography textColor="success600" fontWeight="bold">
      {formatMessage({ id: 'global.on', defaultMessage: 'On' })}
    </Typography>
  );
};

const NameCell = ({ schema }: { schema: Schema }) => {
  const { formatMessage } = useIntl();

  return (
    // The API id is what you need when you need it and noise the rest of the
    // time, so it waits behind the icon.
    <Flex gap={2} alignItems="center">
      <Typography textColor="neutral800" fontWeight="bold">
        {upperFirst(schema.info.displayName)}
      </Typography>
      <Tooltip label={schema.uid}>
        <Flex tag="span" alignItems="center">
          <Information
            fill="neutral500"
            width="1.6rem"
            height="1.6rem"
            aria-label={formatMessage(
              { id: getTrad('index.column.apiId'), defaultMessage: 'API ID: {uid}' },
              { uid: schema.uid }
            )}
          />
        </Flex>
      </Tooltip>
    </Flex>
  );
};

const CategoryCell = ({ schema }: { schema: Schema }) => (
  <Typography textColor="neutral700">
    {upperFirst((schema as { category?: string }).category ?? '')}
  </Typography>
);

const DraftAndPublishCell = ({ schema }: { schema: Schema }) => (
  <OnOff on={hasDraftAndPublish(schema)} />
);

/**
 * "All content types" — the builder's front door.
 *
 * The sidebar lists names, which is the one thing you already know. This lists
 * what actually distinguishes one schema from another: how many fields it has,
 * whether it is localized, which workspaces see it, whether it has drafts. The
 * columns beyond the intrinsic ones come from the plugins that own those
 * options (see schemaRegistry).
 *
 * Everything here is already in the browser — `useDataManager()` holds every
 * schema in full — so searching, filtering and sorting happen in memory and the
 * page has no loading state of its own.
 */
export const SchemaIndex = () => {
  const { formatMessage, locale } = useIntl();
  const navigate = useNavigate();
  const { trackUsage } = useTracking();
  const { contentTypes, components, isInDevelopmentMode } = useDataManager();
  const { onOpenModalCreateSchema } = useFormModalNavigation();

  const { contains } = useFilter(locale, { sensitivity: 'base' });
  const formatter = useCollator(locale, { sensitivity: 'base' });

  // Both in the URL rather than in state: the same `_q` the Content Manager's
  // search writes, and a `kind` the breadcrumb can link back to — so a filtered
  // list is a link someone can send, and a schema's crumb lands on its own tab.
  const [{ query }, setQuery] = useQueryParams<{ _q?: string; kind?: string }>();
  const search = query?._q ?? '';
  const tab: TabKind = isTabKind(query?.kind) ? query.kind : 'collectionType';
  const setTab = (next: TabKind) => setQuery({ kind: next }, 'push');
  const [applied, setApplied] = React.useState<Record<string, string>>({});

  const filters = getSchemaFilters();
  // Called unconditionally and in registration order — the list is frozen
  // before the first render (see schemaRegistry).
  const filterOptions = filters.map((filter) => filter.useOptions());

  const all = React.useMemo<Schema[]>(() => {
    const types = Object.values(contentTypes).filter((type) => type.visible);
    return [...types, ...Object.values(components)] as Schema[];
  }, [contentTypes, components]);

  const rows = React.useMemo(() => {
    return all
      .filter((schema) => {
        if (tab === 'component') {
          return schema.modelType === 'component';
        }
        return isContentType(schema) && (schema as { kind?: string }).kind === tab;
      })
      .filter((schema) => {
        if (search.length === 0) {
          return true;
        }
        return contains(schema.info.displayName, search) || contains(schema.uid, search);
      })
      .filter((schema) =>
        filters.every((filter) => {
          const value = applied[filter.id];
          return value === undefined || filter.matches(schema, value);
        })
      )
      .sort((a, b) => formatter.compare(a.info.displayName, b.info.displayName));
  }, [all, tab, search, applied, filters, contains, formatter]);

  const counts = React.useMemo(
    () => ({
      collectionType: all.filter(
        (s) => isContentType(s) && (s as { kind?: string }).kind === 'collectionType'
      ).length,
      singleType: all.filter(
        (s) => isContentType(s) && (s as { kind?: string }).kind === 'singleType'
      ).length,
      component: all.filter((s) => s.modelType === 'component').length,
    }),
    [all]
  );

  const openCreate = (payload: OpenModalCreateSchemaPayload) => {
    trackUsage('willCreateContentType');
    onOpenModalCreateSchema(payload);
  };

  const pluginColumns = getSchemaColumns(tab === 'component' ? 'component' : 'contentType');

  /**
   * One list, both halves of the table.
   *
   * A header and its cells were written apart, and removing a column from one
   * side left the other behind — every value then read under its neighbour's
   * name. They cannot drift while they come from here.
   */
  const columns: Array<{
    name: string;
    label: string;
    Cell: React.ComponentType<{ schema: Schema }>;
  }> = [
    {
      name: 'name',
      label: formatMessage({ id: getTrad('index.column.name'), defaultMessage: 'Name' }),
      Cell: NameCell,
    },
    tab === 'component'
      ? {
          name: 'category',
          label: formatMessage({
            id: getTrad('index.column.category'),
            defaultMessage: 'Category',
          }),
          Cell: CategoryCell,
        }
      : {
          name: 'draftAndPublish',
          label: formatMessage({
            id: getTrad('index.column.draftAndPublish'),
            defaultMessage: 'Draft & publish',
          }),
          Cell: DraftAndPublishCell,
        },
    ...pluginColumns.map((column) => ({
      name: column.id,
      label: formatMessage(column.header),
      Cell: column.Cell,
    })),
  ];

  const headers = columns.map(({ name, label }) => ({ name, label, sortable: false }));

  const appliedEntries = Object.entries(applied);

  const clearFilter = (id: string) => {
    setApplied((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return (
    <>
      {/* The guided tour opens on the page you land on, and that is this one. */}
      <tours.contentTypeBuilder.Introduction>
        <Box />
      </tours.contentTypeBuilder.Introduction>
      <Layouts.Header
        title={formatMessage({ id: getTrad('index.title'), defaultMessage: 'All content types' })}
        subtitle={formatMessage(
          {
            id: getTrad('index.subtitle'),
            defaultMessage:
              '{types, plural, one {# content type} other {# content types}} · {components, plural, one {# component} other {# components}}',
          },
          { types: counts.collectionType + counts.singleType, components: counts.component }
        )}
        primaryAction={
          isInDevelopmentMode ? (
            <Menu.Root>
              <tours.contentTypeBuilder.YourTurn asChild>
                <Menu.Trigger startIcon={<Plus />} variant="default">
                  {formatMessage({ id: getTrad('index.create'), defaultMessage: 'Create new' })}
                </Menu.Trigger>
              </tours.contentTypeBuilder.YourTurn>
              <Menu.Content zIndex={2}>
                <Menu.Item
                  onSelect={() =>
                    openCreate({
                      modalType: 'contentType',
                      kind: 'collectionType',
                      actionType: 'create',
                      forTarget: 'contentType',
                    })
                  }
                >
                  {formatMessage({
                    id: getTrad('index.create.collectionType'),
                    defaultMessage: 'Collection type',
                  })}
                </Menu.Item>
                <Menu.Item
                  onSelect={() =>
                    openCreate({
                      modalType: 'contentType',
                      kind: 'singleType',
                      actionType: 'create',
                      forTarget: 'contentType',
                    })
                  }
                >
                  {formatMessage({
                    id: getTrad('index.create.singleType'),
                    defaultMessage: 'Single type',
                  })}
                </Menu.Item>
                <Menu.Item
                  onSelect={() =>
                    openCreate({
                      modalType: 'component',
                      actionType: 'create',
                      forTarget: 'component',
                    } as OpenModalCreateSchemaPayload)
                  }
                >
                  {formatMessage({
                    id: getTrad('index.create.component'),
                    defaultMessage: 'Component',
                  })}
                </Menu.Item>
              </Menu.Content>
            </Menu.Root>
          ) : null
        }
      />

      {/* The same bar the Content Manager uses: search collapses to its icon
          until asked for, the filters button sits beside it, and whatever is
          applied gets a line of its own underneath (`bottomActions`). */}
      <Layouts.Action
        startActions={
          <>
            <SearchInput
              label={formatMessage({
                id: getTrad('index.search.label'),
                defaultMessage: 'Search schemas',
              })}
              placeholder={formatMessage({
                id: getTrad('index.search.placeholder'),
                defaultMessage: 'Search content types and components',
              })}
            />
            {filters.length > 0 ? (
              <Menu.Root>
                <Menu.Trigger variant="tertiary" startIcon={<Filter />}>
                  {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
                </Menu.Trigger>
                <Menu.Content zIndex={2} popoverPlacement="bottom-start">
                  <Box padding={3}>
                    <Flex direction="column" alignItems="stretch" gap={3} width="220px">
                      {filters.map((filter, index) => (
                        <Field.Root key={filter.id} name={filter.id}>
                          <Field.Label>{formatMessage(filter.label)}</Field.Label>
                          <SingleSelect
                            value={applied[filter.id] ?? ''}
                            onChange={(value: string | number) =>
                              setApplied((current) => ({ ...current, [filter.id]: String(value) }))
                            }
                            placeholder={formatMessage({
                              id: getTrad('index.filter.any'),
                              defaultMessage: 'Any',
                            })}
                          >
                            {filterOptions[index].map((option) => (
                              <SingleSelectOption key={option.value} value={option.value}>
                                {option.label}
                              </SingleSelectOption>
                            ))}
                          </SingleSelect>
                        </Field.Root>
                      ))}
                    </Flex>
                  </Box>
                </Menu.Content>
              </Menu.Root>
            ) : null}
          </>
        }
        bottomActions={
          appliedEntries.length > 0 ? (
            <>
              {appliedEntries.map(([id, value]) => {
                const filter = filters.find((entry) => entry.id === id);
                const index = filters.findIndex((entry) => entry.id === id);
                const option = filterOptions[index]?.find((entry) => entry.value === value);
                if (!filter) {
                  return null;
                }
                return (
                  <Tag key={id} icon={<Cross />} onClick={() => clearFilter(id)}>
                    {`${formatMessage(filter.label)}: ${option?.label ?? value}`}
                  </Tag>
                );
              })}
              <Button variant="tertiary" size="S" onClick={() => setApplied({})}>
                {formatMessage({ id: getTrad('index.filter.clear'), defaultMessage: 'Clear all' })}
              </Button>
            </>
          ) : null
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {/* The tabs label the table, so they sit on it rather than near it. */}
          <Flex direction="column" alignItems="stretch" gap={0}>
            <Tabs.Root value={tab} onValueChange={(value: string) => setTab(value as TabKind)}>
              <Tabs.List
                aria-label={formatMessage({
                  id: getTrad('index.tabs.label'),
                  defaultMessage: 'Schema kinds',
                })}
              >
                <tours.contentTypeBuilder.CollectionTypes asChild>
                  <Tabs.Trigger value="collectionType">
                    {formatMessage(
                      {
                        id: getTrad('index.tab.collectionTypes'),
                        defaultMessage: 'Collection types',
                      },
                      { count: counts.collectionType }
                    )}
                    {` (${counts.collectionType})`}
                  </Tabs.Trigger>
                </tours.contentTypeBuilder.CollectionTypes>
                <tours.contentTypeBuilder.SingleTypes asChild>
                  <Tabs.Trigger value="singleType">
                    {formatMessage({
                      id: getTrad('index.tab.singleTypes'),
                      defaultMessage: 'Single types',
                    })}
                    {` (${counts.singleType})`}
                  </Tabs.Trigger>
                </tours.contentTypeBuilder.SingleTypes>
                <tours.contentTypeBuilder.Components asChild>
                  <Tabs.Trigger value="component">
                    {formatMessage({
                      id: getTrad('index.tab.components'),
                      defaultMessage: 'Components',
                    })}
                    {` (${counts.component})`}
                  </Tabs.Trigger>
                </tours.contentTypeBuilder.Components>
              </Tabs.List>
            </Tabs.Root>

            {/* The table's row type wants an `id`; schemas are keyed by uid. */}
            <Table.Root
              rows={rows.map((schema) => ({ ...schema, id: schema.uid }))}
              headers={headers}
            >
              <Table.Content>
                <Table.Head>
                  {headers.map((header) => (
                    <Table.HeaderCell key={header.name} {...header} />
                  ))}
                </Table.Head>
                <Table.Empty
                  content={formatMessage({
                    id: getTrad('index.empty'),
                    defaultMessage: 'No schema matches those filters.',
                  })}
                />
                <Table.Body>
                  {rows.map((schema) => (
                    <ClickableRow
                      key={schema.uid}
                      onClick={() =>
                        navigate(
                          schema.modelType === 'component'
                            ? `/plugins/${pluginId}/component-categories/${
                                (schema as { category?: string }).category
                              }/${schema.uid}`
                            : `/plugins/${pluginId}/content-types/${schema.uid}`
                        )
                      }
                    >
                      {columns.map(({ name, Cell }) => (
                        <Table.Cell key={name}>
                          <Cell schema={schema} />
                        </Table.Cell>
                      ))}
                    </ClickableRow>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.Root>
          </Flex>
        </Flex>
      </Layouts.Content>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default SchemaIndex;
