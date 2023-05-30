import React, { memo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { connect } from 'react-redux';
import isEqual from 'lodash/isEqual';
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
  getYupInnerErrors,
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
} from '@strapi/design-system';

import { ArrowLeft, Plus, Cog } from '@strapi/icons';
import { useMutation } from 'react-query';

import DynamicTable from '../../components/DynamicTable';
import AttributeFilter from '../../components/AttributeFilter';
import { InjectionZone } from '../../../shared/components';

import permissions from '../../../permissions';

import { createYupSchema, getRequestUrl, getTrad } from '../../utils';

import FieldPicker from './FieldPicker';
import PaginationFooter from './PaginationFooter';
import { getData, getDataSucceeded, onChangeListHeaders, onResetListHeaders } from './actions';
import makeSelectListView from './selectors';
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
    metadatas,
    settings: { bulkable: isBulkable, filterable: isFilterable, searchable: isSearchable },
  } = contentType;

  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { refetchPermissions } = useRBACProvider();
  const trackUsageRef = useRef(trackUsage);
  const fetchPermissionsRef = useRef(refetchPermissions);
  const { notifyStatus } = useNotifyAT();
  const { formatAPIError } = useAPIErrorHandler(getTrad);

  useFocusWhenNavigate();

  const [{ query }] = useQueryParams();
  const params = buildQueryString(query);
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  const { pathname } = useLocation();
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const hasDraftAndPublish = contentType.options?.draftAndPublish ?? false;
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
  const requestUrlRef = useRef('');

  const fetchData = useCallback(
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

  const handleConfirmDeleteAllData = useCallback(
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

  const handleConfirmDeleteData = useCallback(
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

  useEffect(() => {
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
    id: contentType.info.displayName,
    defaultMessage: contentType.info.displayName || defaultHeaderLayoutTitle,
  });

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
              canCreate={canCreate}
              canDelete={canDelete}
              canPublish={canPublish}
              contentTypeName={headerLayoutTitle}
              onConfirmDelete={handleConfirmDeleteData}
              onConfirmDeleteAll={handleConfirmDeleteAllData}
              onConfirmPublishAll={handleConfirmPublishAllData}
              onConfirmUnpublishAll={handleConfirmUnpublishAllData}
              isBulkable={isBulkable}
              isLoading={isLoading}
              // FIXME: remove the layout props drilling
              layout={layout}
              rows={data}
              action={getCreateAction({ variant: 'secondary' })}
            />
            <PaginationFooter pagination={{ pageCount: pagination?.pageCount || 1 }} />
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

export default compose(withConnect)(memo(ListView, isEqual));
