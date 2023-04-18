import * as React from 'react';
import {
  useFetchClient,
  useAPIErrorHandler,
  useNotification,
  useTracking,
  useQueryParams,
} from '@strapi/helper-plugin';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useFindRedirectionLink } from '..';
import { getRequestUrl, getTrad } from '../../utils';
import {
  getData,
  getDataSucceeded,
  initForm,
  setStatus,
  submitSucceeded,
} from '../../sharedReducers/crudReducer/actions';

export function useContentType(contentType, id) {
  const { uid } = contentType;

  const isCreating = !id;
  const isCollectionType = contentType.kind === 'collectionType';
  const collectionTypeUrlSlug = `${isCollectionType ? 'collection' : 'single'}-types`;

  const [isCreatingEntry, setIsCreatingEntry] = React.useState(isCreating);

  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const { trackUsage } = useTracking();
  const { push, replace } = useHistory();
  const [{ rawQuery }] = useQueryParams();
  const fetchClient = useFetchClient();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const query = useQuery(
    'content-type',
    async () => {
      dispatch(getData());

      try {
        const { data } = await fetchClient.get(
          getRequestUrl(`${collectionTypeUrlSlug}/${uid}/${id}`)
        );

        return data;
      } catch (error) {
        // todo
      }

      return null;
    },
    {
      // Entities that have not yet been created can not be fetched
      enabled: !isCreating,

      onSuccess(data) {
        dispatch(getDataSucceeded(data));
      },

      onError(error) {
        const responseStatus = error.response.status;

        switch (responseStatus) {
          case 404:
            push(redirectLink);
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
  const redirectLink = useFindRedirectionLink(uid);
  const queryClient = useQueryClient();

  async function contentTypeMutation({ method, body, action, type, onSuccess = () => {} }) {
    const typeMapping = {
      create: {
        trackingEventName: 'Create',
        notificationkey: 'save',
      },

      update: {
        trackingEventName: 'Edit',
        notificationkey: 'save',
      },

      publish: {
        trackingEventName: 'Publish',
        notificationkey: 'publish',
      },

      unpublish: {
        trackingEventName: 'Unpublish',
        notificationkey: 'unpublish',
      },

      delete: {
        trackingEventName: 'Delete',
        notificationkey: 'delete',
      },
    };

    const { notificationkey, trackingEventName } = typeMapping[type];

    trackUsage(`will${trackingEventName}Entry`);

    try {
      let url = getRequestUrl(
        `${collectionTypeUrlSlug}/${uid}/${method !== 'post' || action ? id : ''}/${
          action ? `/${action}` : ''
        }`
      );
      const { data } = await fetchClient[method](url, { body });

      trackUsage(`did${trackingEventName}Entry`);

      toggleNotification({
        type: 'success',
        message: { id: getTrad(`success.record.${notificationkey}`) },
      });

      if (method !== 'delete') {
        dispatch(submitSucceeded(data));
      }

      onSuccess();

      return data;
    } catch (error) {
      trackUsage(`didNot${trackingEventName}Entry`);
    }

    return null;
  }

  async function update(body) {
    dispatch(setStatus('submit-pending'));

    return mutation.mutateAsync({ method: 'put', data: body, type: 'update' });
  }

  async function create(body) {
    dispatch(setStatus('submit-pending'));

    return mutation.mutateAsync({
      method: 'post',
      data: body,
      type: 'create',
      onSuccess() {
        // maeh
        queryClient.invalidateQueries(['relation']);

        if (!isCollectionType) {
          setIsCreatingEntry(false);
        }
      },
    });
  }

  async function publish() {
    dispatch(setStatus('publish-pending'));

    const numberOfDraftRelations = await fetchNumberOfDraftRelations();

    // TODO
    if (numberOfDraftRelations) {
      throw new Error('bla');
    }

    return mutation.mutateAsync({ method: 'post', action: 'publish', type: 'publish' });
  }

  async function unpublish() {
    dispatch(setStatus('unpublish-pending'));

    return mutation.mutateAsync({ method: 'post', action: 'unpublish', type: 'unpublish' });
  }

  async function del() {
    return mutation.mutateAsync({
      method: 'delete',
      type: 'delete',
      onSuccess() {
        if (!isCollectionType) {
          dispatch(initForm(rawQuery, true));
        } else {
          // Back to the CM list view
          replace(redirectLink);
        }
      },
    });
  }

  // react-query too?
  async function fetchNumberOfDraftRelations() {
    try {
      trackUsage('willCheckDraftRelations');

      const endPoint = getRequestUrl(`${uid}/actions/numberOfDraftRelations`);

      dispatch(setStatus('draft-relation-check-pending'));

      const {
        data: { data },
      } = await fetchClient.get(endPoint);
      trackUsage('didCheckDraftRelations');

      dispatch(setStatus('resolved'));

      return data;
    } catch (err) {
      dispatch(setStatus('resolved'));
    }

    return null;
  }

  return {
    contentType: {
      query,
      mutation,
    },
    isCreating: isCreatingEntry,
    create,
    update,
    del,
    publish,
    unpublish,
  };
}
