import { memo, useCallback, useEffect, useRef, useReducer, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { get } from 'lodash';
import { request, useGlobalContext } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import {
  createDefaultForm,
  formatComponentData,
  getTrad,
  removePasswordFieldsFromData,
} from '../../utils';
import { crudInitialState, crudReducer } from '../../sharedReducers';
import { getRequestUrl } from './utils';

// This container is used to handle the CRUD
const SingleTypeFormWrapper = ({ allLayoutData, children, from, slug }) => {
  const { emitEvent } = useGlobalContext();
  const { push } = useHistory();
  const emitEventRef = useRef(emitEvent);
  const [isCreatingEntry, setIsCreatingEntry] = useState(true);

  const [
    { componentsDataStructure, contentTypeDataStructure, data, isLoading, status },
    dispatch,
  ] = useReducer(crudReducer, crudInitialState);

  const cleanReceivedData = useCallback(
    data => {
      const cleaned = removePasswordFieldsFromData(
        data,
        allLayoutData.contentType,
        allLayoutData.components
      );

      // This is needed in order to add a unique id for the repeatable components, in order to make the reorder easier
      return formatComponentData(cleaned, allLayoutData.contentType, allLayoutData.components);
    },
    [allLayoutData]
  );

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

  // Check if creation mode or editing mode
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async signal => {
      dispatch({ type: 'GET_DATA' });

      setIsCreatingEntry(true);

      try {
        const data = await request(getRequestUrl(slug), { method: 'GET', signal });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: cleanReceivedData(data),
        });
        setIsCreatingEntry(false);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        const responseStatus = get(err, 'response.status', null);

        // Creating a single type
        if (responseStatus === 404) {
          dispatch({ type: 'INIT_FORM' });
        }

        if (responseStatus === 403) {
          strapi.notification.info(getTrad('permissions.not-allowed.update'));

          push(from);
        }
      }
    };

    fetchData(signal);

    return () => abortController.abort();
  }, [cleanReceivedData, from, push, slug]);

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

        const response = await request(getRequestUrl(`${slug}`), {
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
    [slug]
  );

  const onDeleteSucceeded = useCallback(() => {
    setIsCreatingEntry(true);

    dispatch({ type: 'INIT_FORM' });
  }, []);

  const onPost = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(slug);

      try {
        dispatch({ type: 'SET_STATUS', status: 'submit-pending' });

        const response = await request(endPoint, { method: 'PUT', body });

        emitEventRef.current('didCreateEntry', trackerProperty);
        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(response) });
        setIsCreatingEntry(false);
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      } catch (err) {
        emitEventRef.current('didNotCreateEntry', { error: err, trackerProperty });

        displayErrors(err);
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      }
    },
    [cleanReceivedData, displayErrors, slug]
  );
  const onPublish = useCallback(async () => {
    try {
      emitEventRef.current('willPublishEntry');
      const endPoint = getRequestUrl(`${slug}/actions/publish`);

      dispatch({ type: 'SET_STATUS', status: 'publish-pending' });

      const data = await request(endPoint, { method: 'POST' });

      emitEventRef.current('didPublishEntry');
      strapi.notification.toggle({
        type: 'success',
        message: { id: getTrad('success.record.publish') },
      });

      dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(data) });
      dispatch({ type: 'SET_STATUS', status: 'resolved' });
    } catch (err) {
      displayErrors(err);
      dispatch({ type: 'SET_STATUS', status: 'resolved' });
    }
  }, [cleanReceivedData, displayErrors, slug]);

  const onPut = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(`${slug}`);

      try {
        emitEventRef.current('willEditEntry', trackerProperty);

        dispatch({ type: 'SET_STATUS', status: 'submit-pending' });

        const response = await request(endPoint, { method: 'PUT', body });

        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        emitEventRef.current('didEditEntry', { trackerProperty });

        dispatch({ type: 'SUBMIT_SUCCEEDED', data: cleanReceivedData(response) });
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      } catch (err) {
        displayErrors(err);

        emitEventRef.current('didNotEditEntry', { error: err, trackerProperty });
        dispatch({ type: 'SET_STATUS', status: 'resolved' });
      }
    },
    [cleanReceivedData, displayErrors, slug]
  );

  // The publish and unpublish method could be refactored but let's leave the duplication for now
  const onUnpublish = useCallback(async () => {
    const endPoint = getRequestUrl(`${slug}/actions/unpublish`);
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
  }, [cleanReceivedData, displayErrors, slug]);

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
  });
};

SingleTypeFormWrapper.defaultProps = {
  from: '/',
};

SingleTypeFormWrapper.propTypes = {
  allLayoutData: PropTypes.shape({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.object.isRequired,
  }).isRequired,
  children: PropTypes.func.isRequired,
  from: PropTypes.string,
  slug: PropTypes.string.isRequired,
};

export default memo(SingleTypeFormWrapper);
