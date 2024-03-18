import * as React from 'react';

import {
  Main,
  ActionLayout,
  Button,
  ContentLayout,
  HeaderLayout,
  useNotifyAT,
  Flex,
  Td,
  Tr,
  Typography,
  Status,
  lightTheme,
  ButtonProps,
} from '@strapi/design-system';
import {
  findMatchingPermissions,
  NoPermissions,
  SearchURLQuery,
  useFetchClient,
  useFocusWhenNavigate,
  useQueryParams,
  useNotification,
  useRBACProvider,
  useTracking,
  Link,
  useAPIErrorHandler,
  useCollator,
  useStrapiApp,
  Table as HelperPluginTable,
  PaginationURLQuery,
  PageSizeURLQuery,
  Permission,
  LoadingIndicatorPage,
  useRBAC,
  FilterData,
} from '@strapi/helper-plugin';
import { ArrowLeft, Plus } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { AxiosError } from 'axios';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useHistory, useLocation, Link as ReactRouterLink } from 'react-router-dom';

import { InjectionZone } from '../../../components/InjectionZone';
import { HOOKS } from '../../../constants';
import { useTypedDispatch, useTypedSelector } from '../../../core/store/hooks';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { useAdminUsers } from '../../../services/users';
import { CREATOR_FIELDS } from '../../constants/attributes';
import { buildValidGetParams } from '../../utils/api';
import { FormattedLayouts, ListLayoutRow } from '../../utils/layouts';
import { generatePermissionsObject } from '../../utils/permissions';
import { getTranslation } from '../../utils/translations';
import { getDisplayName } from '../../utils/users';
import { getData, getDataSucceeded } from '../ListViewLayoutManager';

import { AdminUsersFilter } from './components/AdminUsersFilter';
import {
  AutoCloneFailureModal,
  type ProhibitedCloningField,
} from './components/AutoCloneFailureModal';
import { BulkActionsRenderer } from './components/BulkActions/Actions';
import { Filter } from './components/Filter';
import { Table } from './components/Table';
import { CellContent } from './components/TableCells/CellContent';
import { ViewSettingsMenu } from './components/ViewSettingsMenu';
import { useAllowedAttributes } from './hooks/useAllowedAttributes';

import type { Entity } from '@strapi/types';

const { INJECT_COLUMN_IN_TABLE } = HOOKS;
const REVIEW_WORKFLOW_COLUMNS_CE = null;
const REVIEW_WORKFLOW_COLUMNS_CELL_CE = {
  ReviewWorkflowsStageEE: () => null,
  ReviewWorkflowsAssigneeEE: () => null,
};
const REVIEW_WORKFLOW_FILTER_CE: FilterData[] = [];
const USER_FILTER_ATTRIBUTES = [...CREATOR_FIELDS, 'strapi_assignee'];

/* -------------------------------------------------------------------------------------------------
 * ListViewPage
 * -----------------------------------------------------------------------------------------------*/

interface TableHeader extends Omit<ListLayoutRow, 'metadatas'> {
  metadatas: ListLayoutRow['metadatas'] & {
    label: string;
  };
  cellFormatter?: (
    data: Contracts.CollectionTypes.Find.Response['results'][number],
    header: Omit<TableHeader, 'cellFormatter'>
  ) => React.ReactNode;
}

interface ListViewPageProps {
  canCreate?: boolean;
  canDelete?: boolean;
  canRead?: boolean;
  canPublish?: boolean;
  layout: FormattedLayouts;
  slug: string;
}

const ListViewPage = ({
  canCreate,
  canDelete,
  canRead,
  canPublish,
  layout,
  slug,
}: ListViewPageProps) => {
  const dispatch = useTypedDispatch();
  const { pagination, isLoading, data } = useTypedSelector(
    (state) => state['content-manager_listView']
  );
  const { total } = pagination;
  const { contentType } = layout;
  const {
    info,
    options,
    metadatas,
    settings: { bulkable: isBulkable, filterable: isFilterable, searchable: isSearchable },
  } = contentType;
  const [isConfirmDeleteRowOpen, setIsConfirmDeleteRowOpen] = React.useState(false);
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { allPermissions, refetchPermissions } = useRBACProvider();
  const { notifyStatus } = useNotifyAT();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
    filters?: {
      $and: Array<{
        [key: string]: {
          id?: {
            $eq?: string;
            $ne?: string;
          };
        };
      }>;
    };
  }>();
  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage, locale } = useIntl();
  const { get, post, del } = useFetchClient();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const selectedUserIds =
    query?.filters?.$and?.reduce<Entity.ID[]>((acc, filter) => {
      const [key, value] = Object.entries(filter)[0];
      const id = value.id?.$eq || value.id?.$ne;

      // TODO: strapi_assignee should not be in here and rather defined
      // in the ee directory.
      if (id && USER_FILTER_ATTRIBUTES.includes(key) && !acc.includes(id)) {
        acc.push(id);
      }

      return acc;
    }, []) ?? [];

  const { data: userData, isLoading: isLoadingAdminUsers } = useAdminUsers(
    { filters: { id: { $in: selectedUserIds } } },
    {
      // fetch the list of admin users only if the filter contains users and the
      // current user has permissions to display users
      skip:
        selectedUserIds.length === 0 ||
        findMatchingPermissions(allPermissions, [
          {
            action: 'admin::users.read',
            subject: null,
          },
        ]).length === 0,
    }
  );

  const { users = [] } = userData ?? {};

  useFocusWhenNavigate();

  const params = React.useMemo(() => buildValidGetParams(query), [query]);
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  const displayedAttributeFilters = allowedAttributes.map((name) => {
    const attribute = contentType.attributes[name];

    const trackedEvent = {
      name: 'didFilterEntries',
      properties: { useRelation: attribute.type === 'relation' },
    } as const;

    const { mainField, label } = metadatas[name].list;

    const filter: FilterData = {
      name,
      metadatas: { label: formatMessage({ id: label, defaultMessage: label }) },
      fieldSchema: {
        type: attribute.type,
        options: 'enum' in attribute ? attribute.enum : [],
        mainField,
      },
      trackedEvent,
    };

    if (
      attribute.type === 'relation' &&
      'target' in attribute &&
      attribute.target === 'admin::user'
    ) {
      filter.metadatas = {
        ...filter.metadatas,
        customOperators: [
          {
            intlLabel: {
              id: 'components.FilterOptions.FILTER_TYPES.$eq',
              defaultMessage: 'is',
            },
            value: '$eq',
          },
          {
            intlLabel: {
              id: 'components.FilterOptions.FILTER_TYPES.$ne',
              defaultMessage: 'is not',
            },
            value: '$ne',
          },
        ],
        customInput: AdminUsersFilter,
        options: users.map((user) => ({
          label: getDisplayName(user, formatMessage),
          customValue: user.id.toString(),
        })),
      };

      filter.fieldSchema.mainField = {
        ...mainField,
        name: 'id',
      };
    }

    return filter;
  });

  const hasDraftAndPublish = options?.draftAndPublish ?? false;
  const hasReviewWorkflows = options?.reviewWorkflows ?? false;

  const reviewWorkflowColumns = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CE,
    async () =>
      (await import('../../../../../ee/admin/src/content-manager/pages/ListView/constants'))
        .REVIEW_WORKFLOW_COLUMNS_EE,
    {
      enabled: !!options?.reviewWorkflows,
    }
  );
  const ReviewWorkflowsColumns = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CELL_CE,
    async () => {
      const { ReviewWorkflowsStageEE, ReviewWorkflowsAssigneeEE } = await import(
        '../../../../../ee/admin/src/content-manager/pages/ListView/components/ReviewWorkflowsColumn'
      );

      return { ReviewWorkflowsStageEE, ReviewWorkflowsAssigneeEE };
    },
    {
      enabled: hasReviewWorkflows,
    }
  );

  const reviewWorkflowFilter = useEnterprise(
    REVIEW_WORKFLOW_FILTER_CE,
    async () =>
      (await import('../../../../../ee/admin/src/content-manager/pages/ListView/constants'))
        .REVIEW_WORKFLOW_FILTERS,
    {
      combine(ceFilters, eeFilters) {
        return [
          ...ceFilters,
          ...eeFilters
            .filter((eeFilter) => {
              // do not display the filter at all, if the current user does
              // not have permissions to read admin users
              if (eeFilter.name === 'strapi_assignee') {
                return (
                  findMatchingPermissions(allPermissions, [
                    {
                      action: 'admin::users.read',
                      subject: null,
                    },
                  ]).length > 0
                );
              }

              return true;
            })
            .map((eeFilter) => ({
              ...eeFilter,
              metadatas: {
                ...eeFilter.metadatas,
                // the stage filter needs the current content-type uid to fetch
                // the list of stages that can be assigned to this content-type
                ...(eeFilter.name === 'strapi_stage' ? { uid: contentType.uid } : {}),

                // translate the filter label
                label: formatMessage(eeFilter.metadatas.label),

                // `options` allows the filter-tag to render the displayname
                // of a user over a plain id
                options:
                  eeFilter.name === 'strapi_assignee'
                    ? users.map((user) => ({
                        label: getDisplayName(user, formatMessage),
                        customValue: user.id.toString(),
                      }))
                    : undefined,
              },
            })),
        ];
      },

      defaultValue: [],

      // we have to wait for admin users to be fully loaded, because otherwise
      // combine is called to early and does not contain the latest state of
      // the users array
      enabled: hasReviewWorkflows && !isLoadingAdminUsers,
    }
    /**
     * this is cast because the data returns MessageDescriptor
     * as `metadatas.label` _then_ we turn it to a string.
     */
  ) as FilterData[];

  const { refetch } = useQuery<
    Contracts.CollectionTypes.Find.Response,
    AxiosError<Required<Pick<Contracts.CollectionTypes.Find.Response, 'error'>>>
  >(
    ['content-manager', 'collection-types', slug, params],
    async () => {
      dispatch(getData());

      const { data } = await get<Contracts.CollectionTypes.Find.Response>(
        `/content-manager/collection-types/${slug}`,
        { params }
      );

      return data;
    },
    {
      enabled: canRead,
      onError(err) {
        const resStatus = err?.response?.status ?? null;

        if (resStatus === 403) {
          refetchPermissions();

          toggleNotification({
            type: 'info',
            message: { id: getTranslation('permissions.not-allowed.update') },
          });

          push('/');

          return;
        }

        toggleNotification({
          type: 'warning',
          message: { id: getTranslation('error.model.fetch') },
        });
      },
      onSuccess({ pagination, results }) {
        // If user enters a page number that doesn't exist, redirect him to the last page
        if (pagination.page && pagination.page > pagination.pageCount && pagination.pageCount > 0) {
          const query = {
            ...params,
            page: pagination.pageCount,
          };

          push({
            pathname,
            state: { from: pathname },
            search: stringify(query),
          });

          return;
        }

        notifyStatus(
          formatMessage(
            {
              id: getTranslation('utils.data-loaded'),
              defaultMessage:
                '{number, plural, =1 {# entry has} other {# entries have}} successfully been loaded',
            },
            // Using the plural form
            { number: pagination.pageSize }
          )
        );

        dispatch(getDataSucceeded(pagination, results));
      },
    }
  );

  const handleConfirmDeleteData = React.useCallback(
    async (idToDelete: Contracts.CollectionTypes.Delete.Params['id']) => {
      try {
        await del<Contracts.CollectionTypes.Delete.Response>(
          `/content-manager/collection-types/${slug}/${idToDelete}`
        );

        await refetch();

        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.delete') },
        });
      } catch (err) {
        if (err instanceof AxiosError) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(err),
          });
        }
      }
    },
    [slug, toggleNotification, formatAPIError, del, refetch]
  );

  const defaultHeaderLayoutTitle = formatMessage({
    id: getTranslation('header.name'),
    defaultMessage: 'Content',
  });
  const headerLayoutTitle = formatMessage({
    id: info.displayName,
    defaultMessage: info.displayName || defaultHeaderLayoutTitle,
  });

  const { runHookWaterfall } = useStrapiApp();
  const displayedHeaders = useTypedSelector(
    (state) => state['content-manager_listView'].displayedHeaders
  );

  const tableHeaders: TableHeader[] = React.useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders,
      layout,
    });

    const formattedHeaders = headers.displayedHeaders.map((header) => {
      if (header.fieldSchema.type === 'relation') {
        return {
          ...header,
          metadatas: {
            ...header.metadatas,
            label: formatMessage({
              id: getTranslation(`containers.ListPage.table-headers.${header.name}`),
              defaultMessage: header.metadatas.label,
            }),
          },
          name: `${header.name}.${header.metadatas.mainField?.name ?? ''}`,
        } satisfies TableHeader;
      }

      return {
        ...header,
        metadatas: {
          ...header.metadatas,
          label: formatMessage({
            id: getTranslation(`containers.ListPage.table-headers.${header.name}`),
            defaultMessage: header.metadatas.label,
          }),
        },
      } satisfies TableHeader;
    });

    if (hasDraftAndPublish) {
      formattedHeaders.push({
        key: '__published_at_temp_key__',
        name: 'publishedAt',
        fieldSchema: {
          type: 'custom',
        },
        metadatas: {
          label: formatMessage({
            id: getTranslation(`containers.ListPage.table-headers.publishedAt`),
            defaultMessage: 'publishedAt',
          }),
          searchable: false,
          sortable: true,
        },
      } satisfies TableHeader);
    }

    if (reviewWorkflowColumns) {
      formattedHeaders.push(
        ...reviewWorkflowColumns.map((column) => {
          return {
            ...column,
            metadatas: {
              ...column.metadatas,
              label: formatMessage(column.metadatas.label),
            },
          } satisfies TableHeader;
        })
      );
    }

    return formattedHeaders;
  }, [
    runHookWaterfall,
    displayedHeaders,
    layout,
    reviewWorkflowColumns,
    hasDraftAndPublish,
    formatMessage,
  ]);

  const handleRowClick = (id: Entity.ID) => () => {
    trackUsage('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
      search: pluginsQueryParams,
    });
  };

  const [clonedEntryId, setClonedEntryId] = React.useState<Entity.ID | null>(null);
  const [prohibitedCloningFields, setProhibitedCloningFields] = React.useState<
    ProhibitedCloningField[]
  >([]);

  const handleCloneClick =
    (id: Contracts.CollectionTypes.AutoClone.Params['sourceId']) => async () => {
      try {
        const { data } = await post<Contracts.CollectionTypes.AutoClone.Response>(
          `/content-manager/collection-types/${contentType.uid}/auto-clone/${id}?${pluginsQueryParams}`
        );

        if ('id' in data) {
          push({
            pathname: `${pathname}/${data.id}`,
            state: { from: pathname },
            search: pluginsQueryParams,
          });
        }
      } catch (err) {
        if (err instanceof AxiosError) {
          const { prohibitedFields } = err.response?.data.error.details;
          setClonedEntryId(id);
          setProhibitedCloningFields(prohibitedFields);
        }
      }
    };

  // Add 1 column for the checkbox and 1 for the actions
  const colCount = tableHeaders.length + 2;

  // Block rendering until the review stage component is fully loaded in EE
  if (!ReviewWorkflowsColumns) {
    return null;
  }

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        primaryAction={
          canCreate ? (
            <CreateButton
              hasDraftAndPublish={hasDraftAndPublish}
              params={query.plugins ? pluginsQueryParams : ''}
            />
          ) : null
        }
        subtitle={
          canRead
            ? formatMessage(
                {
                  id: getTranslation('pages.ListView.header-subtitle'),
                  defaultMessage:
                    '{number, plural, =0 {# entries} one {# entry} other {# entries}} found',
                },
                { number: total }
              )
            : undefined
        }
        title={headerLayoutTitle}
        navigationAction={
          <Link startIcon={<ArrowLeft />} to="/content-manager/">
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      {!canRead && (
        <ActionLayout endActions={<InjectionZone area="contentManager.listView.actions" />} />
      )}
      {canRead && (
        <ActionLayout
          endActions={
            <>
              <InjectionZone area="contentManager.listView.actions" />
              <ViewSettingsMenu slug={slug} />
            </>
          }
          startActions={
            <>
              {isSearchable && (
                <SearchURLQuery
                  label={formatMessage(
                    { id: 'app.component.search.label', defaultMessage: 'Search for {target}' },
                    { target: headerLayoutTitle }
                  )}
                  placeholder={formatMessage({
                    id: 'global.search',
                    defaultMessage: 'Search',
                  })}
                  trackedEvent="didSearch"
                />
              )}
              {isFilterable && !isLoadingAdminUsers && (
                <Filter
                  displayedFilters={[...displayedAttributeFilters, ...reviewWorkflowFilter].sort(
                    (a, b) => formatter.compare(a.metadatas.label, b.metadatas.label)
                  )}
                />
              )}
            </>
          }
        />
      )}
      <ContentLayout>
        {canRead ? (
          <Flex gap={4} direction="column" alignItems="stretch">
            <HelperPluginTable.Root rows={data} isLoading={isLoading} colCount={colCount}>
              <HelperPluginTable.ActionBar>
                <BulkActionsRenderer />
              </HelperPluginTable.ActionBar>
              <HelperPluginTable.Content>
                <HelperPluginTable.Head>
                  {/* Bulk action select all checkbox */}
                  <HelperPluginTable.HeaderCheckboxCell />
                  {/* Dynamic headers based on fields */}
                  {tableHeaders.map(({ fieldSchema, key, name, metadatas }) => (
                    <HelperPluginTable.HeaderCell
                      key={key}
                      name={name}
                      fieldSchemaType={fieldSchema.type}
                      relationFieldName={metadatas.mainField?.name}
                      isSortable={metadatas.sortable}
                      label={metadatas.label}
                    />
                  ))}
                  {/* Visually hidden header for actions */}
                  <HelperPluginTable.HeaderHiddenActionsCell />
                </HelperPluginTable.Head>
                {/* Loading content */}
                <HelperPluginTable.LoadingBody />
                {/* Empty content */}
                <HelperPluginTable.EmptyBody
                  contentType={headerLayoutTitle}
                  action={
                    canCreate ? (
                      <CreateButton
                        variant="secondary"
                        hasDraftAndPublish={hasDraftAndPublish}
                        params={query.plugins ? pluginsQueryParams : ''}
                      />
                    ) : null
                  }
                />
                <AutoCloneFailureModal
                  entryId={clonedEntryId}
                  onClose={() => setClonedEntryId(null)}
                  prohibitedFields={prohibitedCloningFields}
                  pluginQueryParams={pluginsQueryParams}
                />
                {/* Content */}
                <Table.Root
                  onConfirmDelete={handleConfirmDeleteData}
                  isConfirmDeleteRowOpen={isConfirmDeleteRowOpen}
                  setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
                >
                  {data.map((rowData, index) => {
                    return (
                      <Tr cursor="pointer" key={rowData.id} onClick={handleRowClick(rowData.id)}>
                        {/* Bulk action row checkbox */}
                        <Td>
                          <Table.CheckboxDataCell rowId={rowData.id} index={index} />
                        </Td>
                        {/* Field data */}
                        {tableHeaders.map(({ key, name, cellFormatter, ...rest }) => {
                          if (hasDraftAndPublish && name === 'publishedAt') {
                            return (
                              <Td key={key}>
                                <Status
                                  width="min-content"
                                  showBullet={false}
                                  variant={rowData.publishedAt ? 'success' : 'secondary'}
                                  size="S"
                                >
                                  <Typography
                                    fontWeight="bold"
                                    textColor={`${
                                      rowData.publishedAt ? 'success' : 'secondary'
                                    }700`}
                                  >
                                    {formatMessage({
                                      id: getTranslation(
                                        `containers.List.${
                                          rowData.publishedAt ? 'published' : 'draft'
                                        }`
                                      ),
                                      defaultMessage: rowData.publishedAt ? 'Published' : 'Draft',
                                    })}
                                  </Typography>
                                </Status>
                              </Td>
                            );
                          }

                          if (hasReviewWorkflows) {
                            if (name === 'strapi_stage') {
                              return (
                                <Td key={key}>
                                  {rowData.strapi_stage ? (
                                    <ReviewWorkflowsColumns.ReviewWorkflowsStageEE
                                      color={
                                        rowData.strapi_stage.color ?? lightTheme.colors.primary600
                                      }
                                      name={rowData.strapi_stage.name}
                                    />
                                  ) : (
                                    <Typography textColor="neutral800">-</Typography>
                                  )}
                                </Td>
                              );
                            }
                            if (name === 'strapi_assignee') {
                              return (
                                <Td key={key}>
                                  {rowData.strapi_assignee ? (
                                    <ReviewWorkflowsColumns.ReviewWorkflowsAssigneeEE
                                      user={rowData.strapi_assignee}
                                    />
                                  ) : (
                                    <Typography textColor="neutral800">-</Typography>
                                  )}
                                </Td>
                              );
                            }
                          }

                          if (['createdBy', 'updatedBy'].includes(name.split('.')[0])) {
                            // Display the users full name
                            // Some entries doesn't have a user assigned as creator/updater (ex: entries created through content API)
                            // In this case, we display a dash
                            return (
                              <Td key={key}>
                                <Typography textColor="neutral800">
                                  {rowData[name.split('.')[0]]
                                    ? getDisplayName(rowData[name.split('.')[0]], formatMessage)
                                    : '-'}
                                </Typography>
                              </Td>
                            );
                          }

                          if (typeof cellFormatter === 'function') {
                            return (
                              <Td key={key}>{cellFormatter(rowData, { key, name, ...rest })}</Td>
                            );
                          }

                          return (
                            <Td key={key}>
                              <CellContent
                                content={rowData[name.split('.')[0]]}
                                name={name}
                                contentType={layout.contentType}
                                rowId={rowData.id}
                                {...rest}
                              />
                            </Td>
                          );
                        })}
                        {/* Actions: edit, duplicate, delete */}
                        {(canDelete || canPublish) && isBulkable && (
                          <Td>
                            <Table.EntityActionsDataCell
                              rowId={rowData.id}
                              index={index}
                              setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
                              canCreate={canCreate}
                              canDelete={canDelete}
                              handleCloneClick={handleCloneClick}
                            />
                          </Td>
                        )}
                      </Tr>
                    );
                  })}
                </Table.Root>
              </HelperPluginTable.Content>
            </HelperPluginTable.Root>
            <Flex alignItems="flex-end" justifyContent="space-between">
              <PageSizeURLQuery trackedEvent="willChangeNumberOfEntriesPerPage" />
              <PaginationURLQuery pagination={{ pageCount: pagination?.pageCount || 1 }} />
            </Flex>
          </Flex>
        ) : (
          <NoPermissions />
        )}
      </ContentLayout>
    </Main>
  );
};

interface CreateButtonProps extends Pick<ButtonProps, 'variant'> {
  hasDraftAndPublish?: boolean;
  params?: string;
}

const CreateButton = ({ hasDraftAndPublish = false, params = '', variant }: CreateButtonProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();

  return (
    <Button
      variant={variant}
      forwardedAs={ReactRouterLink}
      onClick={() => {
        const trackerProperty = hasDraftAndPublish ? { status: 'draft' } : {};

        trackUsage('willCreateEntry', trackerProperty);
      }}
      startIcon={<Plus />}
      style={{ textDecoration: 'none' }}
      // @ts-expect-error – DS inference does not work with as or forwardedAs
      to={{
        pathname: `${pathname}/create`,
        search: params,
      }}
    >
      {formatMessage({
        id: getTranslation('HeaderLayout.button.label-add-entry'),
        defaultMessage: 'Create new entry',
      })}
    </Button>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedListViewPage
 * -----------------------------------------------------------------------------------------------*/

interface ProtectedListViewPageProps extends ListViewPageProps {
  permissions?: Permission[] | null;
}

const ProtectedListViewPage = ({ permissions, ...restProps }: ProtectedListViewPageProps) => {
  const viewPermissions = React.useMemo(
    () => generatePermissionsObject(restProps.slug),
    [restProps.slug]
  );

  const { isLoading, allowedActions } = useRBAC(viewPermissions, permissions ?? []);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return <ListViewPage {...restProps} {...allowedActions} />;
};

export { ListViewPage, ProtectedListViewPage };
export type { ListViewPageProps, ProtectedListViewPageProps, TableHeader };
