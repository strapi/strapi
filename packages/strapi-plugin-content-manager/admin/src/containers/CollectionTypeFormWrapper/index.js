import React, { memo, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
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
import ConcurrentEditingModal from '../../components/ConcurrentEditingModal';
import concurrentEditingReducer, { concurrentEditingState } from './concurrentEditingReducer';
import { getRequestUrl } from './utils';

// This container is used to handle the CRUD
const CollectionTypeFormWrapper = ({ allLayoutData, children, from, slug, id, origin }) => {
  const { emitEvent } = useGlobalContext();
  const { push, replace } = useHistory();
  const isCreatingEntry = id === 'create';

  const emitEventRef = useRef(emitEvent);
  const lockUIDRef = useRef(null);
  // This ref is used in order to make the user looses the focus of an input when someone take
  // over the edition
  const inputRef = useRef(null);

  const [
    { componentsDataStructure, contentTypeDataStructure, data, isLoading, status },
    dispatch,
  ] = useReducer(crudReducer, crudInitialState);
  const [
    {
      lockFetchingStatus,
      lockInfo,
      showModalLoader,
      hasLock,
      shouldStartFetchingLock,
      showModalForceLock,
    },
    concurrentEditingDispatch,
  ] = useReducer(concurrentEditingReducer, concurrentEditingState);

  // TODO read only
  // const isReadOnlyModeBecauseOfConcurrentEditing = useMemo(() => {
  //   if (!lockInfo) {
  //     return false;
  //   }

  //   return !hasLock;
  // }, [lockInfo, hasLock]);

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

  // Free the lock on page refresh this is needed especially
  // When developing
  useEffect(() => {
    const removeLock = async () => {
      if (!lockURL) {
        return null;
      }

      if (!lockUIDRef.current) {
        return null;
      }

      try {
        await request(`${lockURL}/unlock`, { method: 'POST', body: { uid: lockUIDRef.current } });
      } catch (err) {
        // Silent
      }

      return null;
    };

    window.addEventListener('beforeunload', removeLock);

    return () => {
      window.removeEventListener('beforeunload', removeLock);
    };
  }, [lockURL]);

  // Effect to get the lock
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    // eslint-disable-next-line consistent-return
    const getLock = async signal => {
      try {
        const { success, lockInfo } = await request(`${lockURL}/lock`, { method: 'POST', signal });

        concurrentEditingDispatch({ type: 'FETCH_LOCK_SUCCEEDED', lockInfo, success });

        if (success) {
          return (lockUIDRef.current = lockInfo.uid);
        }

        concurrentEditingDispatch({ type: 'TOGGLE_MODAL' });
      } catch (err) {
        console.log(err);
      }
    };

    if (lockURL) {
      concurrentEditingDispatch({ type: 'FETCH_LOCK' });

      getLock(signal);
    }

    const removeLock = async () => {
      try {
        await request(`${lockURL}/unlock`, { method: 'POST', body: { uid: lockUIDRef.current } });
      } catch (err) {
        // Silent
      }
    };

    return () => {
      // Remove the lock when unmounting
      if (lockUIDRef.current) {
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

  // Effect to extend the lock: keep the edition
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

    // eslint-disable-next-line consistent-return
    const extendLock = async signal => {
      try {
        const { success, lockInfo } = await request(`${lockURL}/extend-lock`, {
          method: 'POST',
          body: { uid: lockUIDRef.current },
          signal,
        });

        // Remove the lock in case of force locking from another user
        if (!success) {
          const { firstname, lastname } = get(lockInfo, ['metadata', 'lockedBy'], {
            firstname: 'Kai',
            lastname: 'Doe',
          });

          concurrentEditingDispatch({ type: 'SET_HAS_LOCK', hasLock: false });
          concurrentEditingDispatch({ type: 'START_FETCHING_LOCK' });

          // Remove the focus of the user
          inputRef.current.focus();

          strapi.notification.toggle({
            type: 'warning',
            message: {
              id: getTrad('notification.concurrent-editing.cannot-save.message'),
            },
          });
          strapi.notification.toggle({
            type: 'warning',
            blockTransition: true,
            message: {
              id: getTrad('notification.concurrent-editing.read-only.message'),
              values: {
                name: `${firstname} ${lastname}`,
              },
            },
            title: {
              id: getTrad('notification.concurrent-editing.read-only.title'),
            },
          });

          clearInterval(extended);

          return (lockUIDRef.current = null);
        }
      } catch (err) {
        // Silent
      }
    };

    if (hasLock) {
      wait();
      extended = setInterval(() => extendLock(signal), 10000);
    }

    return () => {
      abortController.abort();

      if (extended) {
        clearInterval(extended);
      }
    };
  }, [hasLock, lockURL]);

  // Effect to check if the document has been updated
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    let getter = null;

    const checkLock = async () => {
      try {
        const { lockInfo: newLockInfo } = await request(`${lockURL}/lock`, { method: 'GET' });

        if (lockInfo.updatedAt !== newLockInfo.updatedAt) {
          strapi.notification.toggle({
            type: 'success',
            blockTransition: true,
            message: {
              id: getTrad('notification.concurrent-editing.new-content.message'),
            },

            // TODO
            link: {
              url: window.location.href,
              label: {
                id: getTrad('notification.concurrent-editing.new-content.refresh-label'),
              },
            },
          });

          clearInterval(getter);
        }
      } catch (err) {
        // Silent
      }
    };

    if (shouldStartFetchingLock) {
      getter = setInterval(() => checkLock(signal), 10000);
    } else {
      clearInterval(getter);
    }

    return () => {
      abortController.abort();

      clearInterval(getter);
    };
  }, [lockURL, shouldStartFetchingLock, lockInfo]);

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

  // eslint-disable-next-line consistent-return
  const handleConfirmTakeOverEdition = async () => {
    // Lock the app and show a loader in the modal button
    concurrentEditingDispatch({ type: 'TOGGLE_MODAL_LOADER' });

    try {
      const { success, lockInfo } = await request(`${lockURL}/lock`, {
        method: 'POST',
        body: { force: true },
      });

      concurrentEditingDispatch({ type: 'FETCH_LOCK_SUCCEEDED', lockInfo, success });

      // Unlock the app the app and show a loader in the modal button
      concurrentEditingDispatch({ type: 'TOGGLE_MODAL_LOADER' });

      // Close the modal
      handleToggle();

      if (success) {
        return (lockUIDRef.current = lockInfo.uid);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleToggle = useCallback(() => concurrentEditingDispatch({ type: 'TOGGLE_MODAL' }), []);

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

  // eslint-disable-next-line consistent-return
  const waitForLock = useCallback(async () => {
    try {
      const { success, lockInfo } = await request(`${lockURL}/lock`, { method: 'POST' });

      if (success) {
        concurrentEditingDispatch({ type: 'FETCH_LOCK_SUCCEEDED', lockInfo, success });
        handleToggle();

        return (lockUIDRef.current = lockInfo.uid);
      }
    } catch (err) {
      console.log(err);
    }
  }, [handleToggle, lockURL]);

  return (
    <>
      {children({
        componentsDataStructure,
        contentTypeDataStructure,
        data,
        isCreatingEntry,
        isLoadingForData: lockFetchingStatus !== 'resolved' || isLoading,
        onDelete,
        onDeleteSucceeded,
        onPost,
        onPublish,
        onPut,
        onUnpublish,
        status,
      })}
      <ConcurrentEditingModal
        isOpen={showModalForceLock}
        lockInfo={lockInfo}
        onConfirm={handleConfirmTakeOverEdition}
        showButtonLoader={showModalLoader}
        toggle={handleToggle}
        waitForLock={waitForLock}
      />
      <input style={{ zIndex: 0, position: 'absolute', top: 0 }} ref={inputRef} />
    </>
  );
};

CollectionTypeFormWrapper.defaultProps = {
  from: '/',
  origin: null,
};

CollectionTypeFormWrapper.propTypes = {
  allLayoutData: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.exact({
      // eslint-disable-next-line react/no-unused-prop-types
      apiID: PropTypes.string.isRequired,
      attributes: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      info: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      isDisplayed: PropTypes.bool.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      kind: PropTypes.string.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      layouts: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      metadatas: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      options: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
      settings: PropTypes.object.isRequired,
      // eslint-disable-next-line react/no-unused-prop-types
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
