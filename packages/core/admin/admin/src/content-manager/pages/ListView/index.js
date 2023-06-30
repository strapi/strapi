import * as React from 'react';

import {
  IconButton,
  Main,
  Box,
  ActionLayout,
  Button,
  ContentLayout,
  HeaderLayout,
  useNotifyAT,
  Flex,
  Td,
  Tr,
} from '@strapi/design-system';
import {
  NoPermissions,
  CheckPermissions,
  SearchURLQuery,
  useFetchClient,
  useFocusWhenNavigate,
  useQueryParams,
  useNotification,
  useRBACProvider,
  useTracking,
  Link,
  useAPIErrorHandler,
  getYupInnerErrors,
  useStrapiApp,
  Table,
  PaginationURLQuery,
  PageSizeURLQuery,
} from '@strapi/helper-plugin';
import { ArrowLeft, Cog, Plus } from '@strapi/icons';
import axios, { AxiosError } from 'axios';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { useHistory, useLocation, Link as ReactRouterLink } from 'react-router-dom';
import { bindActionCreators, compose } from 'redux';
import styled from 'styled-components';

import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import { selectAdminPermissions } from '../../../pages/App/selectors';
import { InjectionZone } from '../../../shared/components';
import AttributeFilter from '../../components/AttributeFilter';
import { PublicationState } from '../../components/ListViewTable/CellContent/PublicationState';
import { createYupSchema, getRequestUrl, getTrad } from '../../utils';

import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';
import { Body } from './components/Body';
import BulkActionButtons from './components/BulkActionButtons';
import CellContent from './components/CellContent';
import { FieldPicker } from './components/FieldPicker';
import makeSelectListView, { selectDisplayedHeaders } from './selectors';
import { buildQueryString } from './utils';

const ConfigureLayoutBox = styled(Box)`
  svg {
    path {
      fill: ${({ theme }) => theme.colors.neutral900};
    }
  }
`;

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
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = React.useRef(trackUsage);
  const fetchPermissionsRef = React.useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const permissions = useSelector(selectAdminPermissions);

  useFocusWhenNavigate();

  const [{ query }] = useQueryParams();
  const params = buildQueryString(query);
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const hasDraftAndPublish = options?.draftAndPublish || false;
  const fetchClient = useFetchClient();
  const { post, del } = fetchClient;

  const bulkPublishMutation = useMutation(
    (data) =>
      post(`/content-manager/collection-types/${contentType.uid}/actions/bulkPublish`, data),
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: { id: 'content-manager.success.record.publish', defaultMessage: 'Published' },
        });

        fetchData(`/content-manager/collection-types/${slug}${params}`);
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );
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

        fetchData(`/content-manager/collection-types/${slug}${params}`);
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
    async (endPoint, source) => {
      getData();

      // TODO: to remove, it is just a test to check the API
      try {
        const data = await fetchClient.get(
          '/content-manager/collection-types/api::category.category/actions/countManyEntriesDraftRelations?ids=[1,2]'
        );
        console.log('data', data);
      } catch (err) {
        console.error(err);
      }

      try {
        const opts = source ? { cancelToken: source.token } : null;
        const {
          data: { results, pagination: paginationResult },
        } = await fetchClient.get(endPoint, opts);

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
    [formatMessage, getData, getDataSucceeded, notifyStatus, push, toggleNotification, fetchClient]
  );

  const handleConfirmDeleteAllData = React.useCallback(
    async (ids) => {
      try {
        await post(getRequestUrl(`collection-types/${slug}/actions/bulkDelete`), {
          ids,
        });

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);
        trackUsageRef.current('didBulkDeleteEntries');
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    },
    [fetchData, params, slug, toggleNotification, formatAPIError, post]
  );

  const handleConfirmDeleteData = React.useCallback(
    async (idToDelete) => {
      try {
        await del(getRequestUrl(`collection-types/${slug}/${idToDelete}`));

        const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);
        fetchData(requestUrl);

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
    [slug, params, fetchData, toggleNotification, formatAPIError, del]
  );

  /**
   * @param {number[]} selectedEntries - Array of ids to publish
   * @returns {{validIds: number[], errors: Object.<number, string>}} - Returns an object with the valid ids and the errors
   */
  const validateEntriesToPublish = async (selectedEntries) => {
    const validations = { validIds: [], errors: {} };
    // Create the validation schema based on the contentType
    const schema = createYupSchema(
      contentType,
      { components: layout.components },
      { isDraft: false }
    );
    // Get the selected entries
    const entries = data.filter((entry) => {
      return selectedEntries.includes(entry.id);
    });
    // Validate each entry and map the unresolved promises
    const validationPromises = entries.map((entry) =>
      schema.validate(entry, { abortEarly: false })
    );
    // Resolve all the promises in one go
    const resolvedPromises = await Promise.allSettled(validationPromises);
    // Set the validations
    resolvedPromises.forEach((promise) => {
      if (promise.status === 'rejected') {
        const entityId = promise.reason.value.id;
        validations.errors[entityId] = getYupInnerErrors(promise.reason);
      }

      if (promise.status === 'fulfilled') {
        validations.validIds.push(promise.value.id);
      }
    });

    return validations;
  };

  const handleConfirmPublishAllData = async (selectedEntries) => {
    const validations = await validateEntriesToPublish(selectedEntries);

    if (Object.values(validations.errors).length) {
      toggleNotification({
        type: 'warning',
        title: {
          id: 'content-manager.listView.validation.errors.title',
          defaultMessage: 'Action required',
        },
        message: {
          id: 'content-manager.listView.validation.errors.message',
          defaultMessage:
            'Please make sure all fields are valid before publishing (required field, min/max character limit, etc.)',
        },
      });

      throw new Error('Validation error');
    }

    return bulkPublishMutation.mutateAsync({ ids: selectedEntries });
  };

  const handleConfirmUnpublishAllData = (selectedEntries) => {
    return bulkUnpublishMutation.mutateAsync({ ids: selectedEntries });
  };

  React.useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const shouldSendRequest = canRead;
    const requestUrl = getRequestUrl(`collection-types/${slug}${params}`);

    if (shouldSendRequest && requestUrl.includes(requestUrlRef.current)) {
      fetchData(requestUrl, source);
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

    if (!hasDraftAndPublish) {
      return formattedHeaders;
    }

    return [
      ...formattedHeaders,
      {
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
      },
    ];
  }, [runHookWaterfall, displayedHeaders, layout, hasDraftAndPublish, formatMessage]);

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
              <FieldPicker layout={layout} />
              <CheckPermissions
                permissions={permissions.contentManager.collectionTypesConfigurations}
              >
                <ConfigureLayoutBox paddingTop={1} paddingBottom={1}>
                  <IconButton
                    onClick={() => {
                      trackUsage('willEditListLayout');
                    }}
                    forwardedAs={ReactRouterLink}
                    to={{ pathname: `${slug}/configurations/list`, search: pluginsQueryParams }}
                    icon={<Cog />}
                    label={formatMessage({
                      id: 'app.links.configure-view',
                      defaultMessage: 'Configure the view',
                    })}
                  />
                </ConfigureLayoutBox>
              </CheckPermissions>
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
              {isFilterable && (
                <AttributeFilter contentType={contentType} slug={slug} metadatas={metadatas} />
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
                  onConfirmPublishAll={handleConfirmPublishAllData}
                  onConfirmUnpublishAll={handleConfirmUnpublishAllData}
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
                        {tableHeaders.map(({ key, name, ...rest }) => {
                          if (name === 'publishedAt') {
                            return (
                              <Td key={key}>
                                <PublicationState isPublished={Boolean(rowData.publishedAt)} />
                              </Td>
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
