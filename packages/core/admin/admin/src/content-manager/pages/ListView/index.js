import * as React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { connect, useSelector } from 'react-redux';
import isEqual from 'react-fast-compare';
import { bindActionCreators, compose } from 'redux';
import { useIntl } from 'react-intl';
import { useHistory, useLocation, Link as ReactRouterLink } from 'react-router-dom';
import { stringify } from 'qs';
import axios from 'axios';

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
  useStrapiApp,
  DynamicTable,
  PaginationURLQuery,
  PageSizeURLQuery,
} from '@strapi/helper-plugin';

import {
  IconButton,
  Main,
  Box,
  ActionLayout,
  ContentLayout,
  HeaderLayout,
  useNotifyAT,
  Button,
  Flex,
  Typography,
  Status,
} from '@strapi/design-system';

import { ArrowLeft, Plus, Cog } from '@strapi/icons';

import AttributeFilter from '../../components/AttributeFilter';
import { InjectionZone } from '../../../shared/components';
import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';

import permissions from '../../../permissions';

import { getRequestUrl, getTrad } from '../../utils';

import { FieldPicker } from './components/FieldPicker';
import { TableRows } from './components/TableRows';
import { ConfirmDialogDelete } from './components/ConfirmDialogDelete';
import { ConfirmDialogDeleteAll } from './components/ConfirmDialogDeleteAll';

import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';
import makeSelectListView, { selectDisplayedHeaders } from './selectors';
import { buildQueryString } from './utils';

const cmPermissions = permissions.contentManager;

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

  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = React.useRef(trackUsage);
  const fetchPermissionsRef = React.useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();
  const { formatAPIError } = useAPIErrorHandler(getTrad);

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

  // TODO: fixme
  // Using a ref to avoid requests being fired multiple times on slug on change
  // We need it because the hook as mulitple dependencies so it may run before the permissions have checked
  const requestUrlRef = React.useRef('');

  /**
   * TODO: re-write all of this, it's a mess.
   */
  const fetchData = React.useCallback(
    async (endPoint, source) => {
      getData();

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
        // eslint-disable-next-line react/no-unstable-nested-components
        cellFormatter(cellData) {
          const isPublished = cellData.publishedAt;
          const variant = isPublished ? 'success' : 'secondary';

          return (
            <Status width="min-content" showBullet={false} variant={variant} size="S">
              <Typography fontWeight="bold" textColor={`${variant}700`}>
                {formatMessage({
                  id: getTrad(`containers.List.${isPublished ? 'published' : 'draft'}`),
                  defaultMessage: isPublished ? 'Published' : 'Draft',
                })}
              </Typography>
            </Status>
          );
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
              <CheckPermissions permissions={cmPermissions.collectionTypesConfigurations}>
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
          <>
            <DynamicTable
              components={{ ConfirmDialogDelete, ConfirmDialogDeleteAll }}
              contentType={headerLayoutTitle}
              action={getCreateAction({ variant: 'secondary' })}
              isLoading={isLoading}
              headers={tableHeaders}
              onConfirmDelete={handleConfirmDeleteData}
              onConfirmDeleteAll={handleConfirmDeleteAllData}
              onOpenDeleteAllModalTrackedEvent="willBulkDeleteEntries"
              rows={data}
              withBulkActions
              withMainAction={canDelete && isBulkable}
            >
              <TableRows
                canCreate={canCreate}
                canDelete={canDelete}
                contentType={contentType}
                headers={tableHeaders}
                rows={data}
                withBulkActions
                withMainAction={canDelete && isBulkable}
              />
            </DynamicTable>
            <Flex paddingTop={4} alignItems="flex-end" justifyContent="space-between">
              <PageSizeURLQuery trackedEvent="willChangeNumberOfEntriesPerPage" />
              <PaginationURLQuery pagination={{ pageCount: pagination?.pageCount || 1 }} />
            </Flex>
          </>
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
  data: PropTypes.array.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
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
