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
  getData,
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
    ['content-manger', 'content-type', uid, id].filter(Boolean),
    async () => {
      dispatch(getData());

      try {
        const url = [collectionTypeUrlSlug, uid, isCollectionType ? id : null]
          .filter(Boolean)
          .join('/');
        const { data } = await fetchClient.get(getRequestUrl(url));

        return data;
      } catch (err) {
        return isCollectionType ? undefined : {};
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
        dispatch(initForm(rawQuery, true));

        // the admin app can not know before it has fetched a single-type (it doesn't have an id)
        // if it has been created or not. Therefore `isCreating` needs to be
        // reactive and updated after the single-type has been fetched.
        if (!isCollectionType && Object.keys(data).length > 0) {
          setIsCreating(false);
        }
      },

      onError(error) {
        const responseStatus = error.response.status;

        switch (responseStatus) {
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
      },
    }
  );
  const mutation = useMutation(contentTypeMutation, {
    onSuccess() {
      dispatch(setStatus('resolved'));
    },

    onError(error) {
      dispatch(setStatus('resolved'));

      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },
  });
  const contentTypeRedirectLink = useFindRedirectionLink(uid);
  const redirectLink = `${contentTypeRedirectLink}${rawQuery}`;
  const queryClient = useQueryClient();

  async function contentTypeMutation({ method, body, action, type }) {
    const trackingKey = capitalize(type === 'update' ? 'save' : type);

    trackUsage(`will${trackingKey}Entry`);

    try {
      let url = [collectionTypeUrlSlug, uid, id, action ? 'actions' : null, action]
        .filter(Boolean)
        .join('/');

      const { data } = await fetchClient[method](getRequestUrl(url), body);

      trackUsage(`did${trackingKey}Entry`);

      toggleNotification({
        type: 'success',
        message: { id: getTrad(`success.record.${type === 'update' ? 'save' : type}`) },
      });

      dispatch(submitSucceeded(data));

      // TODO: this should probably be done somewhere else
      queryClient.invalidateQueries(['relation']);

      return data;
    } catch (error) {
      trackUsage(`didNot${trackingKey}Entry`);
    }

    return null;
  }

  const update = React.useCallback(
    async (body) => {
      dispatch(setStatus('submit-pending'));

      return mutation.mutateAsync({ method: 'put', body, type: 'update' });
    },
    [dispatch, mutation]
  );

  const create = React.useCallback(
    async (body) => {
      dispatch(setStatus('submit-pending'));

      const res = await mutation.mutateAsync({
        // Creating a single-type is done through put
        method: isCollectionType ? 'post' : 'put',
        body,
        type: 'create',
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

        trackUsage('didCheckDraftRelations');

        return data;
      } catch (err) {
        return null;
      } finally {
        dispatch(setStatus('resolved'));
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

      return Promise.reject(
        new Error('More than one related entity is in draft.', {
          cause: 'number-of-draft-relations',
        })
      );
    }

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
