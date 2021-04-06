import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { get } from 'lodash';
import {
  request,
  useGlobalContext,
  useQueryParams,
  formatComponentData,
  contentManagementUtilRemoveFieldsFromData,
} from 'strapi-helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { createDefaultForm, getTrad, removePasswordFieldsFromData } from '../../utils';
import pluginId from '../../pluginId';
import { useFindRedirectionLink } from '../../hooks';
import {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
} from '../../sharedReducers/crudReducer/actions';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';
import { getRequestUrl } from './utils';

// This container is used to handle the CRUD
const CollectionTypeFormWrapper = ({ allLayoutData, children, slug, id, origin }) => {
  const { emitEvent } = useGlobalContext();
  const { push, replace } = useHistory();
  const [{ rawQuery }] = useQueryParams();
  const dispatch = useDispatch();
  const {
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    isLoading,
    status,
  } = useSelector(selectCrudReducer);
  const redirectionLink = useFindRedirectionLink(slug);

  const isMounted = useRef(true);
  const emitEventRef = useRef(emitEvent);

  const allLayoutDataRef = useRef(allLayoutData);

  const isCreatingEntry = id === null;

  const requestURL = useMemo(() => {
    if (isCreatingEntry && !origin) {
      return null;
    }

    return getRequestUrl(`${slug}/${origin || id}`);
  }, [slug, id, isCreatingEntry, origin]);

  const cleanClonedData = useCallback(
    data => {
      if (!origin) {
        return data;
      }

      const cleaned = contentManagementUtilRemoveFieldsFromData(
        data,
        allLayoutDataRef.current.contentType,
        allLayoutDataRef.current.components
      );

      return cleaned;
    },
    [origin]
  );

  const cleanReceivedData = useCallback(data => {
    const cleaned = removePasswordFieldsFromData(
      data,
      allLayoutDataRef.current.contentType,
      allLayoutDataRef.current.components
    );

    return formatComponentData(
      cleaned,
      allLayoutDataRef.current.contentType,
      allLayoutDataRef.current.components
    );
  }, []);

  // SET THE DEFAULT LAYOUT the effect is applied when the slug changes
  useEffect(() => {
    const componentsDataStructure = Object.keys(allLayoutData.components).reduce((acc, current) => {
      const defaultComponentForm = createDefaultForm(
        get(allLayoutData, ['components', current, 'attributes'], {}),
        allLayoutData.components
      );

      acc[current] = formatComponentData(
        defaultComponentForm,
        allLayoutData.components[current],
        allLayoutData.components
      );

      return acc;
    }, {});

    const contentTypeDataStructure = createDefaultForm(
      allLayoutData.contentType.attributes,
      allLayoutData.components
    );

    const contentTypeDataStructureFormatted = formatComponentData(
      contentTypeDataStructure,
      allLayoutData.contentType,
      allLayoutData.components
    );

    dispatch(setDataStructures(componentsDataStructure, contentTypeDataStructureFormatted));
  }, [allLayoutData, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async signal => {
      dispatch(getData());

      try {
        const data = await request(requestURL, { method: 'GET', signal });

        dispatch(getDataSucceeded(cleanReceivedData(cleanClonedData(data))));
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error(err);

        const resStatus = get(err, 'response.status', null);

        if (resStatus === 404) {
          push(redirectionLink);

          return;
        }

        // Not allowed to read a document
        if (resStatus === 403) {
          strapi.notification.info(getTrad('permissions.not-allowed.update'));

          push(redirectionLink);
        }
      }
    };

    // This is needed in order to reset the form when the query changes
    const init = async () => {
      await dispatch(getData());
      await dispatch(initForm(rawQuery));
    };

    if (!isMounted.current) {
      return () => {};
    }

    if (requestURL) {
      fetchData(signal);
    } else {
      init();
    }

    return () => {
      abortController.abort();
    };
  }, [cleanClonedData, cleanReceivedData, push, requestURL, dispatch, rawQuery, redirectionLink]);

  const displayErrors = useCallback(err => {
    const errorPayload = err.response.payload;
    console.error(errorPayload);

    let errorMessage = get(errorPayload, ['message'], 'Bad Request');

    // TODO handle errors correctly when back-end ready
    if (Array.isArray(errorMessage)) {
      errorMessage = get(errorMessage, ['0', 'messages', '0', 'id']);
    }

    if (typeof errorMessage === 'string') {
      strapi.notification.error(errorMessage);
    }
  }, []);

  const onDelete = useCallback(
    async trackerProperty => {
      try {
        emitEventRef.current('willDeleteEntry', trackerProperty);

        const response = await request(getRequestUrl(`${slug}/${id}`), {
          method: 'DELETE',
        });

        strapi.notification.success(getTrad('success.record.delete'));

        emitEventRef.current('didDeleteEntry', trackerProperty);

        return Promise.resolve(response);
      } catch (err) {
        emitEventRef.current('didNotDeleteEntry', { error: err, ...trackerProperty });

        return Promise.reject(err);
      }
    },
    [id, slug]
  );

  const onDeleteSucceeded = useCallback(() => {
    replace(redirectionLink);
  }, [redirectionLink, replace]);

  const onPost = useCallback(
    async (body, trackerProperty) => {
      const endPoint = `${getRequestUrl(slug)}${rawQuery}`;

      try {
        // Show a loading button in the EditView/Header.js && lock the app => no navigation
        dispatch(setStatus('submit-pending'));

        const response = await request(endPoint, { method: 'POST', body });

        emitEventRef.current('didCreateEntry', trackerProperty);
        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        dispatch(submitSucceeded(cleanReceivedData(response)));
        // Enable navigation and remove loaders
        dispatch(setStatus('resolved'));

        replace(`/plugins/${pluginId}/collectionType/${slug}/${response.id}${rawQuery}`);
      } catch (err) {
        emitEventRef.current('didNotCreateEntry', { error: err, trackerProperty });
        displayErrors(err);
        dispatch(setStatus('resolved'));
      }
    },
    [cleanReceivedData, displayErrors, replace, slug, dispatch, rawQuery]
  );

  const onPublish = useCallback(async () => {
    try {
      emitEventRef.current('willPublishEntry');
      const endPoint = getRequestUrl(`${slug}/${id}/actions/publish`);

      dispatch(setStatus('publish-pending'));

      const data = await request(endPoint, { method: 'POST' });

      emitEventRef.current('didPublishEntry');

      dispatch(submitSucceeded(cleanReceivedData(data)));
      dispatch(setStatus('resolved'));

      strapi.notification.toggle({
        type: 'success',
        message: { id: getTrad('success.record.publish') },
      });
    } catch (err) {
      displayErrors(err);
      dispatch(setStatus('resolved'));
    }
  }, [cleanReceivedData, displayErrors, id, slug, dispatch]);

  const onPut = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(`${slug}/${id}`);

      try {
        emitEventRef.current('willEditEntry', trackerProperty);

        dispatch(setStatus('submit-pending'));

        const response = await request(endPoint, { method: 'PUT', body });

        emitEventRef.current('didEditEntry', { trackerProperty });
        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        dispatch(submitSucceeded(cleanReceivedData(response)));

        dispatch(setStatus('resolved'));
      } catch (err) {
        emitEventRef.current('didNotEditEntry', { error: err, trackerProperty });
        displayErrors(err);

        dispatch(setStatus('resolved'));
      }
    },
    [cleanReceivedData, displayErrors, slug, id, dispatch]
  );

  const onUnpublish = useCallback(async () => {
    const endPoint = getRequestUrl(`${slug}/${id}/actions/unpublish`);

    dispatch(setStatus('unpublish-pending'));

    try {
      emitEventRef.current('willUnpublishEntry');

      const response = await request(endPoint, { method: 'POST' });

      emitEventRef.current('didUnpublishEntry');
      strapi.notification.success(getTrad('success.record.unpublish'));

      dispatch(submitSucceeded(cleanReceivedData(response)));
      dispatch(setStatus('resolved'));
    } catch (err) {
      dispatch(setStatus('resolved'));
      displayErrors(err);
    }
  }, [cleanReceivedData, displayErrors, id, slug, dispatch]);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    isCreatingEntry,
    isLoadingForData: isLoading,
    onDelete,
    onDeleteSucceeded,
    onPost,
    onPublish,
    onPut,
    onUnpublish,
    status,
    redirectionLink,
  });
};

CollectionTypeFormWrapper.defaultProps = {
  id: null,
  origin: null,
};

CollectionTypeFormWrapper.propTypes = {
  allLayoutData: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      apiID: PropTypes.string.isRequired,
      attributes: PropTypes.object.isRequired,
      info: PropTypes.object.isRequired,
      isDisplayed: PropTypes.bool.isRequired,
      kind: PropTypes.string.isRequired,
      layouts: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      options: PropTypes.object.isRequired,
      pluginOptions: PropTypes.object,
      settings: PropTypes.object.isRequired,
      uid: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  children: PropTypes.func.isRequired,
  id: PropTypes.string,
  origin: PropTypes.string,
  slug: PropTypes.string.isRequired,
};

export default memo(CollectionTypeFormWrapper, isEqual);
