import { memo, useCallback, useEffect, useMemo, useRef, useReducer, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { get } from 'lodash';
import { request, useGlobalContext } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import {
  createDefaultForm,
  formatComponentData,
  getTrad,
  removePasswordFieldsFromData,
  removeFieldsFromClonedData,
} from '../../utils';
import pluginId from '../../pluginId';
import { crudInitialState, crudReducer } from '../../sharedReducers';
import { getRequestUrl } from './utils';

// This container is used to handle the CRUD
const CollectionTypeFormWrapper = ({ allLayoutData, children, from, slug, id, origin }) => {
  const { emitEvent } = useGlobalContext();
  const { push, replace } = useHistory();
  const isCreatingEntry = id === 'create';
  const [isLoadingForLockRequest, setIsLoadingForLockRequest] = useState(false);
  const [lock, setHasLock] = useState({ hasLock: false, lockInfo: null });

  const [
    { componentsDataStructure, contentTypeDataStructure, data, isLoading, status },
    dispatch,
  ] = useReducer(crudReducer, crudInitialState);
  const emitEventRef = useRef(emitEvent);

  const requestURL = useMemo(() => {
    if (isCreatingEntry && !origin) {
      return null;
    }

    return getRequestUrl(`${slug}/${origin || id}`);
  }, [slug, id, isCreatingEntry, origin]);

  const lockURL = useMemo(() => {
    if (isCreatingEntry) {
      return null;
    }

    return getRequestUrl(`${slug}/${id}/actions`);
  }, [isCreatingEntry, slug, id]);

  const cleanClonedData = useCallback(
    data => {
      if (!origin) {
        return data;
      }

      const cleaned = removeFieldsFromClonedData(
        data,
        allLayoutData.contentType,
        allLayoutData.components
      );

      return cleaned;
    },
    [allLayoutData, origin]
  );

  const cleanReceivedData = useCallback(
    data => {
      const cleaned = removePasswordFieldsFromData(
        data,
        allLayoutData.contentType,
        allLayoutData.components
      );

      return formatComponentData(cleaned, allLayoutData.contentType, allLayoutData.components);
    },
    [allLayoutData]
  );

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

    dispatch({
      type: 'SET_DATA_STRUCTURES',
      componentsDataStructure,
      contentTypeDataStructure: formatComponentData(
        contentTypeDataStructure,
        allLayoutData.contentType,
        allLayoutData.components
      ),
    });
  }, [allLayoutData]);

  const lockUIDRef = useRef(null);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    // eslint-disable-next-line consistent-return
    const getLock = async signal => {
      try {
        const { success, lockInfo } = await request(`${lockURL}/lock`, { method: 'POST', signal });

        setHasLock({ hasLock: success, lockInfo });
        setIsLoadingForLockRequest(false);

        if (success) {
          return (lockUIDRef.current = lockInfo.uid);
        }
      } catch (err) {
        console.log(err);
      }
    };

    if (lockURL) {
      setIsLoadingForLockRequest(true);
      setHasLock({ hasLock: false, lockInfo: {} });

      getLock(signal);
    }

    const removeLock = () => {
      try {
        request(`${lockURL}/unlock`, { method: 'POST', body: { uid: lockUIDRef.current } });
      } catch (err) {
        // Silent
      }
    };

    return () => {
      // Remove the lock when unmounting
      if (lockUIDRef.current) {
        // TODO remove lock when refreshing browser
        removeLock();
      }

      // Abort request
      if (lockURL) {
        abortController.abort();
      }

      // Reset the ref when navigating from one entry to another
      lockUIDRef.current = null;
    };
  }, [lockURL]);

  // Effect to extend the lock
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    let extended = null;

    const wait = async () => {
      return new Promise(resolve =>
        setTimeout(() => {
          resolve();
        }, [10000])
      );
    };

    const extendLock = async signal => {
      try {
        const { success, lockInfo } = await request(`${lockURL}/extend-lock`, {
          method: 'POST',
          body: { uid: lockUIDRef.current },
          signal,
        });

        // Remove the lock in case of force locking from another user
        if (!success) {
          setHasLock({ hasLock: false, lockInfo });
          clearInterval(extended);
        }
      } catch (err) {
        // Silent
      }
    };

    if (lock.hasLock) {
      wait();
      extended = setInterval(() => extendLock(signal), 10000);
    }

    return () => {
      abortController.abort();

      if (extended) {
        clearInterval(extended);
      }
    };
  }, [lock.hasLock, lockURL]);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const getData = async signal => {
      dispatch({ type: 'GET_DATA' });

      try {
        const data = await request(requestURL, { method: 'GET', signal });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: cleanReceivedData(cleanClonedData(data)),
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error(err);

        const resStatus = get(err, 'response.status', null);

        if (resStatus === 404) {
          push(from);

          return;
        }

        // Not allowed to read a document
        if (resStatus === 403) {
          strapi.notification.info(getTrad('permissions.not-allowed.update'));

          push(from);
        }
      }
    };

    if (requestURL) {
      getData(signal);
    } else {
      dispatch({ type: 'INIT_FORM' });
    }

    return () => {
      abortController.abort();
    };
  }, [requestURL, from, cleanReceivedData, cleanClonedData, push]);

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
    replace(from);
  }, [from, replace]);

  const onPost = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(slug);

      try {
        // Show a loading button in the EditView/Header.js && lock the app => no navigation
        dispatch({ type: 'SET_STATUS', status: 'submit-pending' });

        const response = await request(endPoint, { method: 'POST', body });

        emitEventRef.current('didCreateEntry', trackerProperty);
        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(response) });
        // Enable navigation and remove loaders
        dispatch({ type: 'SET_STATUS', status: 'resolved' });

        replace(`/plugins/${pluginId}/collectionType/${slug}/${response.id}`);
      } catch (err) {
        emitEventRef.current('didNotCreateEntry', { error: err, trackerProperty });
        displayErrors(err);
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      }
    },
    [cleanReceivedData, displayErrors, replace, slug]
  );

  const onPublish = useCallback(async () => {
    try {
      emitEventRef.current('willPublishEntry');
      const endPoint = getRequestUrl(`${slug}/${id}/actions/publish`);

      dispatch({ type: 'SET_STATUS', status: 'publish-pending' });

      const data = await request(endPoint, { method: 'POST' });

      emitEventRef.current('didPublishEntry');

      dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(data) });
      dispatch({ type: 'SET_STATUS', status: 'resolved' });

      strapi.notification.toggle({
        type: 'success',
        message: { id: getTrad('success.record.publish') },
      });
    } catch (err) {
      displayErrors(err);
      dispatch({ type: 'SET_STATUS', status: 'resolved' });
    }
  }, [cleanReceivedData, displayErrors, id, slug]);

  const onPut = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(`${slug}/${id}`);

      try {
        emitEventRef.current('willEditEntry', trackerProperty);

        dispatch({ type: 'SET_STATUS', status: 'submit-pending' });

        const response = await request(endPoint, {
          method: 'PUT',
          body,
          params: { uid: lockUIDRef.current },
        });

        emitEventRef.current('didEditEntry', { trackerProperty });
        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(response) });
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      } catch (err) {
        emitEventRef.current('didNotEditEntry', { error: err, trackerProperty });
        displayErrors(err);
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      }
    },
    [cleanReceivedData, displayErrors, slug, id]
  );

  const onUnpublish = useCallback(async () => {
    const endPoint = getRequestUrl(`${slug}/${id}/actions/unpublish`);

    dispatch({ type: 'SET_STATUS', status: 'unpublish-pending' });

    try {
      emitEventRef.current('willUnpublishEntry');

      const response = await request(endPoint, { method: 'POST' });

      emitEventRef.current('didUnpublishEntry');
      strapi.notification.success(getTrad('success.record.unpublish'));

      dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(response) });
      dispatch({ type: 'SET_STATUS', status: 'resolved' });
    } catch (err) {
      dispatch({ type: 'SET_STATUS', status: 'resolved' });
      displayErrors(err);
    }
  }, [cleanReceivedData, displayErrors, id, slug]);

  // TODO : modal + read only mode...

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    isCreatingEntry,
    isLoadingForData: isLoadingForLockRequest || isLoading,
    onDelete,
    onDeleteSucceeded,
    onPost,
    onPublish,
    onPut,
    onUnpublish,
    status,
  });
};

CollectionTypeFormWrapper.defaultProps = {
  from: '/',
  origin: null,
};

CollectionTypeFormWrapper.propTypes = {
  allLayoutData: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.exact({
      apiID: PropTypes.string.isRequired,
      attributes: PropTypes.object.isRequired,
      info: PropTypes.object.isRequired,
      isDisplayed: PropTypes.bool.isRequired,
      kind: PropTypes.string.isRequired,
      layouts: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
      uid: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  children: PropTypes.func.isRequired,
  from: PropTypes.string,
  id: PropTypes.string.isRequired,
  origin: PropTypes.string,
  slug: PropTypes.string.isRequired,
};

export default memo(CollectionTypeFormWrapper);
