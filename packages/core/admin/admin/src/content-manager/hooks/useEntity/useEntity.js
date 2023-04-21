import * as React from 'react';
import {
  formatContentTypeData,
  useFetchClient,
  useAPIErrorHandler,
  useNotification,
  useTracking,
  useQueryParams,
} from '@strapi/helper-plugin';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import capitalize from 'lodash/capitalize';

import { useFindRedirectionLink } from '..';
import { getRequestUrl, getTrad } from '../../utils';
import {
  getDataSucceeded,
  initForm,
  setStatus,
  submitSucceeded,
} from '../../sharedReducers/crudReducer/actions';

export function useEntity(layout, id) {
  const { contentType, components } = layout;
  const { uid } = contentType;

  const isCollectionType = contentType.kind === 'collectionType';
  const collectionTypeUrlSlug = `${isCollectionType ? 'collection' : 'single'}-types`;

  const [isCreating, setIsCreating] = React.useState(
    (isCollectionType && !id) || !isCollectionType
  );
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const { trackUsage } = useTracking();
  const { push } = useHistory();
  const [{ rawQuery }] = useQueryParams();
  const fetchClient = useFetchClient();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const query = useQuery(
    ['content-manger', 'content-type', uid, id, rawQuery].filter(Boolean),
    async () => {
      try {
        const url = [collectionTypeUrlSlug, uid, isCollectionType ? id : null, rawQuery]
          .filter(Boolean)
          .join('/');
        const { data } = await fetchClient.get(getRequestUrl(url));

        return data;
      } catch (error) {
        // Single-types are expected to throw a 404 if they don't exist yet. We must make sure
        // react-query does recognize this as error, but empty response, so that everything in
        // the onSuccess callback is still executed.
        if (isCollectionType) {
          throw error;
        }

        return {};
      }
    },
    {
      // Single-types are expected to return an HTTP 404 error code if they have
      // not been created
      retry: false,

      onSuccess(data) {
        // this is hell
        const normalizedData = formatContentTypeData(data, contentType, components);

        dispatch(getDataSucceeded(normalizedData));

        // the admin app can not know before it has fetched a single-type (it doesn't have an id)
        // if it has been created or not. Therefore `isCreating` needs to be
        // reactive and updated after the single-type has been fetched.
        if (!isCollectionType && Object.keys(data).length > 0) {
          setIsCreating(false);
        }
      },

      onError(error) {
        // TODO: move this out
        if (error?.response?.status) {
          switch (error.response.status) {
            case 404:
              if (isCollectionType) {
                push(redirectLink);
              }
              break;

            case 403:
              push(redirectLink);
              toggleNotification({
                type: 'info',
                message: { id: getTrad('permissions.not-allowed.update') },
              });
              break;

            default:
              toggleNotification({
                type: 'warning',
                message: formatAPIError(error),
              });
          }
        }
      },
    }
  );
  const mutation = useMutation(contentTypeMutation, {
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      // All mutation methods are wrapped in try/ catch blocks
      // in order to make the error returned by the API handleable
      // in other locations, where they have to be merged e.g. with
      // frontend yup validation errors. The error is forwared by
      // re-throwing it.
      throw error;
    },
  });
  const contentTypeRedirectLink = useFindRedirectionLink(uid);
  const redirectLink = `${contentTypeRedirectLink}${rawQuery}`;
  const queryClient = useQueryClient();

  async function contentTypeMutation({ method, body, action, type, trackerProperty }) {
    const trackingKey = capitalize(type === 'update' ? 'save' : type);

    trackUsage(`will${trackingKey}Entry`);

    try {
      let url = [collectionTypeUrlSlug, uid, id, action ? 'actions' : null, action, rawQuery]
        .filter(Boolean)
        .join('/');

      const res = await fetchClient[method](getRequestUrl(url), body);

      // TODO: the CM returns all of these formats?
      const data = res?.data?.data ?? res?.data ?? res;

      // TODO: this should probably be done somewhere else
      queryClient.invalidateQueries(['relation']);

      dispatch(submitSucceeded(formatContentTypeData(data, contentType, components)));
      trackUsage(`did${trackingKey}Entry`, trackerProperty ? { trackerProperty } : undefined);
      toggleNotification({
        type: 'success',
        message: { id: getTrad(`success.record.${type === 'update' ? 'save' : type}`) },
      });

      return data;
    } catch (error) {
      trackUsage(`didNot${trackingKey}Entry`);

      throw error;
    } finally {
      dispatch(setStatus('resolved'));
    }
  }

  const update = React.useCallback(
    async (body, trackerProperty) => {
      dispatch(setStatus('submit-pending'));

      return mutation.mutateAsync({ method: 'put', body, type: 'update', trackerProperty });
    },
    [dispatch, mutation]
  );

  const create = React.useCallback(
    async (body, trackerProperty) => {
      dispatch(setStatus('submit-pending'));

      const res = await mutation.mutateAsync({
        // Creating a single-type is done through put
        method: isCollectionType ? 'post' : 'put',
        body,
        type: 'create',
        trackerProperty,
      });

      return res;
    },
    [dispatch, isCollectionType, mutation]
  );

  const publish = React.useCallback(async () => {
    async function fetchRelationDraftCount() {
      try {
        trackUsage('willCheckDraftRelations');

        const endPoint = getRequestUrl(`${uid}/actions/numberOfDraftRelations`);

        dispatch(setStatus('draft-relation-check-pending'));

        const {
          data: { data },
        } = await fetchClient.get(endPoint);

        dispatch(setStatus('resolved'));
        trackUsage('didCheckDraftRelations');

        return data;
      } catch (err) {
        return null;
      }
    }

    dispatch(setStatus('publish-pending'));

    const relationDraftCount = await fetchRelationDraftCount();

    // Display confirmation overlay
    if (relationDraftCount && relationDraftCount > 0) {
      dispatch({
        type: 'SET_PUBLISH_CONFIRMATION',
        publishConfirmation: {
          show: true,
          draftCount: relationDraftCount,
        },
      });

      return undefined;
    }

    // eslint-disable-next-line consistent-return
    return mutation.mutateAsync({ method: 'post', action: 'publish', type: 'publish' });

    // TODO: trackUsage is not stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, fetchClient, mutation, uid]);

  const unpublish = React.useCallback(() => {
    dispatch(setStatus('unpublish-pending'));

    return mutation.mutateAsync({ method: 'post', action: 'unpublish', type: 'unpublish' });
  }, [dispatch, mutation]);

  const del = React.useCallback(async () => {
    const res = await mutation.mutateAsync({
      method: 'del',
      type: 'delete',
    });

    if (!isCollectionType) {
      dispatch(initForm(rawQuery, true));
    }

    return res;
  }, [dispatch, isCollectionType, mutation, rawQuery]);

  return {
    entity: query.data,
    isLoading: query.isLoading,
    isCreating,

    create,
    update,
    del,
    publish,
    unpublish,
  };
}
