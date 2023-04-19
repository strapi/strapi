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

// todo: useEntity(id, contentTypeLayout) ?
export function useContentType(layout, id) {
  const { contentType, components } = layout;
  const { uid } = contentType;

  const isCollectionType = contentType.kind === 'collectionType';
  const collectionTypeUrlSlug = `${isCollectionType ? 'collection' : 'single'}-types`;

  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const { trackUsage } = useTracking();
  const { push, replace } = useHistory();
  const [{ rawQuery }] = useQueryParams();
  const fetchClient = useFetchClient();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const query = useQuery(
    ['content-manger', 'content-type', uid, id],
    async () => {
      // Data fetching has started
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
      enabled: !!id,

      onSuccess(data) {
        // this is hell
        const normalizedData = formatContentTypeData(data, contentType, components);
        // Write data to store
        dispatch(getDataSucceeded(normalizedData));
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

  async function contentTypeMutation({ method, body, action, type }) {
    const trackingKey = capitalize(type === 'update' ? 'save' : type);

    trackUsage(`will${trackingKey}Entry`);

    try {
      let url = getRequestUrl(
        `${collectionTypeUrlSlug}/${uid}/${method !== 'post' || action ? id : ''}/${
          action ? `/${action}` : ''
        }`
      );
      const { data } = await fetchClient[method](url, { body });

      trackUsage(`did${trackingKey}Entry`);

      toggleNotification({
        type: 'success',
        message: { id: getTrad(`success.record.${type === 'update' ? 'save' : type}`) },
      });

      dispatch(submitSucceeded(data));

      return data;
    } catch (error) {
      trackUsage(`didNot${trackingKey}Entry`);
    }

    return null;
  }

  async function update(body) {
    dispatch(setStatus('submit-pending'));

    return mutation.mutateAsync({ method: 'put', data: body, type: 'update' });
  }

  async function create(body) {
    dispatch(setStatus('submit-pending'));

    const res = await mutation.mutateAsync({
      method: 'post',
      data: body,
      type: 'create',
    });

    queryClient.invalidateQueries(['relation']);

    return res;
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
    const res = mutation.mutateAsync({
      method: 'delete',
      type: 'delete',
    });

    if (!isCollectionType) {
      dispatch(initForm(rawQuery, true));
    } else {
      // Back to the CM list view
      replace(redirectLink);
    }

    return res;
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
    contentType: query,
    create,
    update,
    del,
    publish,
    unpublish,
  };
}
