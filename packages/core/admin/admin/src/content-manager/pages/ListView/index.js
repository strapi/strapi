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
  Table,
  PaginationURLQuery,
  PageSizeURLQuery,
} from '@strapi/helper-plugin';
import { ArrowLeft, Plus } from '@strapi/icons';
import axios, { AxiosError } from 'axios';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { useHistory, useLocation, Link as ReactRouterLink } from 'react-router-dom';
import { bindActionCreators, compose } from 'redux';

import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { InjectionZone } from '../../../shared/components';
import { Filter } from '../../components/Filter';
import { AdminUsersFilter } from '../../components/Filter/CustomInputs/AdminUsersFilter';
import { CREATOR_FIELDS } from '../../constants/attributes';
import { useAllowedAttributes } from '../../hooks/useAllowedAttributes';
import { getTrad, getDisplayName } from '../../utils';

import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';
import { Body } from './components/Body';
import BulkActionButtons from './components/BulkActionButtons';
import CellContent from './components/CellContent';
import { ViewSettingsMenu } from './components/ViewSettingsMenu';
import makeSelectListView, { selectDisplayedHeaders } from './selectors';
import { buildValidGetParams } from './utils';

const REVIEW_WORKFLOW_COLUMNS_CE = null;
const REVIEW_WORKFLOW_COLUMNS_CELL_CE = () => null;
const REVIEW_WORKFLOW_FILTER_CE = [];
const USER_FILTER_ATTRIBUTES = [...CREATOR_FIELDS, 'strapi_assignee'];

function ListView({
  canCreate,
  canDelete,
  canRead,
  canPublish,
  data,
  getData,
  getDataSucceeded,
  isLoading,
  layout,
  pagination,
  slug,
}) {
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
  const trackUsageRef = React.useRef(trackUsage);
  const fetchPermissionsRef = React.useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const [{ query }] = useQueryParams();
  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage, locale } = useIntl();
  const fetchClient = useFetchClient();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const selectedUserIds =
    query?.filters?.$and?.reduce((acc, filter) => {
      const [key, value] = Object.entries(filter)[0];
      const id = value.id?.$eq || value.id?.$ne;

      // TODO: strapi_assignee should not be in here and rather defined
      // in the ee directory.
      if (USER_FILTER_ATTRIBUTES.includes(key) && !acc.includes(id)) {
        acc.push(id);
      }

      return acc;
    }, []) ?? [];

  const { users, isLoading: isLoadingAdminUsers } = useAdminUsers(
    { filter: { id: { in: selectedUserIds } } },
    {
      // fetch the list of admin users only if the filter contains users and the
      // current user has permissions to display users
      enabled:
        selectedUserIds.length > 0 &&
        findMatchingPermissions(allPermissions, [
          {
            action: 'admin::users.read',
            subject: null,
          },
        ]).length > 0,
    }
  );

  useFocusWhenNavigate();

  const params = React.useMemo(() => buildValidGetParams(query), [query]);
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  const displayedAttributeFilters = allowedAttributes.map((name) => {
    const attribute = contentType.attributes[name];
    const { type, enum: options } = attribute;

    const trackedEvent = {
      name: 'didFilterEntries',
      properties: { useRelation: type === 'relation' },
    };

    const { mainField, label } = metadatas[name].list;

    const filter = {
      name,
      metadatas: { label: formatMessage({ id: label, defaultMessage: label }) },
      fieldSchema: { type, options, mainField },
      trackedEvent,
    };

    if (attribute.type === 'relation' && attribute.target === 'admin::user') {
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
      (
        await import(
          '../../../../../ee/admin/content-manager/pages/ListView/ReviewWorkflowsColumn/constants'
        )
      ).REVIEW_WORKFLOW_COLUMNS_EE,
    {
      enabled: !!options?.reviewWorkflows,
    }
  );
  const ReviewWorkflowsColumns = useEnterprise(
    REVIEW_WORKFLOW_COLUMNS_CELL_CE,
    async () => {
      const { ReviewWorkflowsStageEE, ReviewWorkflowsAssigneeEE } = await import(
        '../../../../../ee/admin/content-manager/pages/ListView/ReviewWorkflowsColumn'
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
      (
        await import(
          '../../../../../ee/admin/content-manager/components/Filter/CustomInputs/ReviewWorkflows/constants'
        )
      ).REVIEW_WORKFLOW_FILTERS,
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
                  eeFilter.name === 'strapi_assignee' &&
                  users.map((user) => ({
                    label: getDisplayName(user, formatMessage),
                    customValue: user.id.toString(),
                  })),
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
  );

  const { post, del } = fetchClient;

  const bulkUnpublishMutation = useMutation(
    (data) =>
      post(`/content-manager/collection-types/${contentType.uid}/actions/bulkUnpublish`, data),
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: {
            id: 'content-manager.success.record.unpublish',
            defaultMessage: 'Unpublished',
          },
        });

        fetchData(`/content-manager/collection-types/${slug}`, { params });
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  // FIXME
  // Using a ref to avoid requests being fired multiple times on slug on change
  // We need it because the hook as mulitple dependencies so it may run before the permissions have checked
  const requestUrlRef = React.useRef('');
  /**
   * TODO: re-write all of this, it's a mess.
   */
  const fetchData = React.useCallback(
    async (endPoint, options) => {
      getData();

      try {
        const {
          data: { results, pagination: paginationResult },
        } = await fetchClient.get(endPoint, options);

        // If user enters a page number that doesn't exist, redirect him to the last page
        if (paginationResult.page > paginationResult.pageCount && paginationResult.pageCount > 0) {
          const query = {
            ...params,
            page: paginationResult.pageCount,
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
              id: getTrad('utils.data-loaded'),
              defaultMessage:
                '{number, plural, =1 {# entry has} other {# entries have}} successfully been loaded',
            },
            // Using the plural form
            { number: paginationResult.count }
          )
        );

        getDataSucceeded(paginationResult, results);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const resStatus = err?.response?.status ?? null;

        if (resStatus === 403) {
          await fetchPermissionsRef.current();

          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });

          push('/');

          return;
        }

        toggleNotification({
          type: 'warning',
          message: { id: getTrad('error.model.fetch') },
        });
      }
    },
    [
      formatMessage,
      getData,
      getDataSucceeded,
      notifyStatus,
      push,
      toggleNotification,
      fetchClient,
      params,
      pathname,
    ]
  );

  const handleConfirmDeleteAllData = React.useCallback(
    async (ids) => {
      try {
        await post(`/content-manager/collection-types/${slug}/actions/bulkDelete`, {
          ids,
        });

        fetchData(`/content-manager/collection-types/${slug}`, { params });

        trackUsageRef.current('didBulkDeleteEntries');
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    },
    [slug, toggleNotification, formatAPIError, post, fetchData, params]
  );

  const handleConfirmDeleteData = React.useCallback(
    async (idToDelete) => {
      try {
        await del(`/content-manager/collection-types/${slug}/${idToDelete}`);

        const requestUrl = `/content-manager/collection-types/${slug}`;
        fetchData(requestUrl, { params });

        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.delete') },
        });
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    },
    [slug, toggleNotification, formatAPIError, del, fetchData, params]
  );

  const handleConfirmUnpublishAllData = (selectedEntries) => {
    return bulkUnpublishMutation.mutateAsync({ ids: selectedEntries });
  };

  React.useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const shouldSendRequest = canRead;
    const requestUrl = `/content-manager/collection-types/${slug}`;

    if (shouldSendRequest && requestUrl.includes(requestUrlRef.current)) {
      fetchData(requestUrl, { cancelToken: source.token, params });
    }

    return () => {
      requestUrlRef.current = slug;

      source.cancel('Operation canceled by the user.');
    };
  }, [canRead, getData, slug, params, getDataSucceeded, fetchData]);

  const defaultHeaderLayoutTitle = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });
  const headerLayoutTitle = formatMessage({
    id: info.displayName,
    defaultMessage: info.displayName || defaultHeaderLayoutTitle,
  });

  const { runHookWaterfall } = useStrapiApp();
  const displayedHeaders = useSelector(selectDisplayedHeaders);

  const tableHeaders = React.useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders,
      layout,
    });

    const formattedHeaders = headers.displayedHeaders.map((header) => {
      const { metadatas } = header;

      if (header.fieldSchema.type === 'relation') {
        const sortFieldValue = `${header.name}.${header.metadatas.mainField.name}`;

        return {
          ...header,
          metadatas: {
            ...metadatas,
            label: formatMessage({
              id: getTrad(`containers.ListPage.table-headers.${header.name}`),
              defaultMessage: metadatas.label,
            }),
          },
          name: sortFieldValue,
        };
      }

      return {
        ...header,
        metadatas: {
          ...metadatas,
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.${header.name}`),
            defaultMessage: metadatas.label,
          }),
        },
      };
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
            id: getTrad(`containers.ListPage.table-headers.publishedAt`),
            defaultMessage: 'publishedAt',
          }),
          searchable: false,
          sortable: true,
        },
      });
    }

    if (reviewWorkflowColumns) {
      // Make sure the column header label is translated
      reviewWorkflowColumns.map((column) => {
        if (typeof column.metadatas.label !== 'string') {
          column.metadatas.label = formatMessage(column.metadatas.label);
        }

        return column;
      });

      formattedHeaders.push(...reviewWorkflowColumns);
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

  const subtitle = canRead
    ? formatMessage(
        {
          id: getTrad('pages.ListView.header-subtitle'),
          defaultMessage: '{number, plural, =0 {# entries} one {# entry} other {# entries}} found',
        },
        { number: total }
      )
    : null;

  const getCreateAction = (props) =>
    canCreate ? (
      <Button
        {...props}
        forwardedAs={ReactRouterLink}
        onClick={() => {
          const trackerProperty = hasDraftAndPublish ? { status: 'draft' } : {};

          trackUsageRef.current('willCreateEntry', trackerProperty);
        }}
        to={{
          pathname: `${pathname}/create`,
          search: query.plugins ? pluginsQueryParams : '',
        }}
        startIcon={<Plus />}
        style={{ textDecoration: 'none' }}
      >
        {formatMessage({
          id: getTrad('HeaderLayout.button.label-add-entry'),
          defaultMessage: 'Create new entry',
        })}
      </Button>
    ) : null;

  /**
   *
   * @param {string} id
   * @returns void
   */
  const handleRowClick = (id) => () => {
    trackUsage('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
      search: pluginsQueryParams,
    });
  };

  const handleCloneClick = (id) => async () => {
    try {
      const { data } = await post(
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
        push({
          pathname: `${pathname}/create/clone/${id}`,
          state: { from: pathname, error: formatAPIError(err) },
          search: pluginsQueryParams,
        });
      }
    }
  };

  // Add 1 column for the checkbox and 1 for the actions
  const colCount = tableHeaders.length + 2;

  // We have this function to refetch data when selected entries modal is closed
  const refetchData = () => {
    fetchData(`/content-manager/collection-types/${slug}`, { params });
  };

  // Block rendering until the review stage component is fully loaded in EE
  if (!ReviewWorkflowsColumns) {
    return null;
  }

  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        primaryAction={getCreateAction()}
        subtitle={subtitle}
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
              <ViewSettingsMenu slug={slug} layout={layout} />
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
            <Table.Root rows={data} isLoading={isLoading} colCount={colCount}>
              <Table.ActionBar>
                <BulkActionButtons
                  showPublish={canPublish && hasDraftAndPublish}
                  showDelete={canDelete}
                  onConfirmDeleteAll={handleConfirmDeleteAllData}
                  onConfirmUnpublishAll={handleConfirmUnpublishAllData}
                  refetchData={refetchData}
                />
              </Table.ActionBar>
              <Table.Content>
                <Table.Head>
                  {/* Bulk action select all checkbox */}
                  <Table.HeaderCheckboxCell />
                  {/* Dynamic headers based on fields */}
                  {tableHeaders.map(({ fieldSchema, key, name, metadatas }) => (
                    <Table.HeaderCell
                      key={key}
                      name={name}
                      fieldSchemaType={fieldSchema.type}
                      relationFieldName={metadatas.mainField?.name}
                      isSortable={metadatas.sortable}
                      label={metadatas.label}
                    />
                  ))}
                  {/* Visually hidden header for actions */}
                  <Table.HeaderHiddenActionsCell />
                </Table.Head>
                {/* Loading content */}
                <Table.LoadingBody />
                {/* Empty content */}
                <Table.EmptyBody
                  contentType={headerLayoutTitle}
                  aciton={getCreateAction({ variant: 'secondary' })}
                />
                {/* Content */}
                <Body.Root
                  onConfirmDelete={handleConfirmDeleteData}
                  isConfirmDeleteRowOpen={isConfirmDeleteRowOpen}
                  setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
                >
                  {data.map((rowData, index) => {
                    return (
                      <Tr cursor="pointer" key={data.id} onClick={handleRowClick(rowData.id)}>
                        {/* Bulk action row checkbox */}
                        <Body.CheckboxDataCell rowId={rowData.id} index={index} />
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
                                      id: getTrad(
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
                                {...rest}
                                rowId={rowData.id}
                              />
                            </Td>
                          );
                        })}
                        {/* Actions: edit, duplicate, delete */}
                        {(canDelete || canPublish) && isBulkable && (
                          <Body.EntityActionsDataCell
                            rowId={rowData.id}
                            index={index}
                            setIsConfirmDeleteRowOpen={setIsConfirmDeleteRowOpen}
                            canCreate={canCreate}
                            canDelete={canDelete}
                            handleCloneClick={handleCloneClick}
                          />
                        )}
                      </Tr>
                    );
                  })}
                </Body.Root>
              </Table.Content>
            </Table.Root>
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
}

ListView.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  canPublish: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ displayName: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  pagination: PropTypes.shape({ total: PropTypes.number.isRequired, pageCount: PropTypes.number })
    .isRequired,
  slug: PropTypes.string.isRequired,
};

const mapStateToProps = makeSelectListView();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      onChangeListHeaders,
      onResetListHeaders,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(React.memo(ListView, isEqual));
