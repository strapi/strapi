import * as React from 'react';
import {
  useFetchClient,
  useAPIErrorHandler,
  useNotification,
  useTracking,
  useQueryParams,
  useGuidedTour,
  formatContentTypeData,
} from '@strapi/helper-plugin';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useFindRedirectionLink } from '..';
import { getRequestUrl, getTrad, createDefaultForm } from '../../utils';
import {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
} from '../../sharedReducers/crudReducer/actions';

export function useContentType(layout, id) {
  const { components, contentType } = layout;
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
  const mutation = useMutation(contentTypeMutation);
  const redirectLink = useFindRedirectionLink(uid);
  const queryClient = useQueryClient();
  const { setCurrentStep } = useGuidedTour();

  // TODO: can we find a way to not do this?
  React.useEffect(() => {
    dispatch(resetProps());
  }, [dispatch]);

  // TODO: maeh
  React.useEffect(() => {
    const componentsDataStructure = Object.keys(components).reduce((acc, current) => {
      const defaultComponentForm = createDefaultForm(
        components?.[current]?.attributes ?? {},
        components
      );

      acc[current] = formatContentTypeData(defaultComponentForm, components[current], components);

      return acc;
    }, {});

    const contentTypeDataStructure = createDefaultForm(contentType.attributes, components);
    const contentTypeDataStructureFormatted = formatContentTypeData(
      contentTypeDataStructure,
      contentType,
      components
    );

    dispatch(setDataStructures(componentsDataStructure, contentTypeDataStructureFormatted));
  }, [dispatch, contentType, components]);

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

      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    } finally {
      // TODO: could be derived outside from mutation
      dispatch(setStatus('resolved'));
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
        // TODO: Move guided tour out of this
        setCurrentStep('contentManager.success');
        queryClient.invalidateQueries(['relation']);
        replace(getRequestUrl(`/content-manager/collectionType/${uid}/${id}${rawQuery}`));

        if (!isCollectionType) {
          setIsCreatingEntry(false);
        }
      },
    });
  }

  async function publish() {
    dispatch(setStatus('publish-pending'));

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
