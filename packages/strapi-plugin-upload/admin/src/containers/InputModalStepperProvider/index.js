import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { request, generateSearchFromFilters } from 'strapi-helper-plugin';
import { omitBy, get } from 'lodash';

import InputModalStepperContext from '../../contexts/InputModal/InputModalDataManager';
import getRequestUrl from '../../utils/getRequestUrl';
import pluginId from '../../pluginId';
import init from './init';
import reducer, { initialState } from './reducer';

const InputModalStepperProvider = ({ isOpen, multiple, children }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { params, filesToUpload } = reducerState;

  useEffect(() => {
    if (isOpen) {
      fetchMediaLib();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, params]);

  const handleRemoveFileToUpload = fileIndex => {
    dispatch({
      type: 'REMOVE_FILE_TO_UPLOAD',
      fileIndex,
    });
  };

  const handleFileToEditChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleResetFileToEdit = () => {
    dispatch({
      type: 'RESET_FILE_TO_EDIT',
    });
  };

  const removeFilter = index => {
    dispatch({
      type: 'REMOVE_FILTER',
      filterToRemove: index,
    });
  };

  const handleClose = () => {
    dispatch({
      type: 'RESET_PROPS',
    });
  };

  const handleFileSelection = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_FILE_SELECTION',
      id: parseInt(name, 10),
      value,
    });
  };

  const handleAllFileSelection = () => {
    dispatch({
      type: 'TOGGLE_SELECT_ALL',
    });
  };

  const setParam = param => {
    dispatch({
      type: 'SET_PARAM',
      param,
    });
  };

  const goTo = to => {
    dispatch({
      type: 'GO_TO',
      to,
    });
  };

  const handleGoToEditNewFile = fileIndex => {
    dispatch({
      type: 'SET_FILE_TO_EDIT',
      fileIndex,
    });

    goTo('edit-new');
  };

  const handleCleanFilesError = () => {
    dispatch({
      type: 'CLEAN_FILES_ERROR',
    });
  };

  const handleSetCropResult = blob => {
    dispatch({
      type: 'SET_CROP_RESULT',
      blob,
    });
  };

  const handleCancelFileToUpload = fileIndex => {
    const fileToCancel = get(filesToUpload, fileIndex, {});

    // Cancel upload
    fileToCancel.abortController.abort();

    handleRemoveFileToUpload(fileIndex);
  };

  const fetchMediaLibFilesCount = async () => {
    const requestURL = getRequestUrl('files/count');

    try {
      const data = await request(`${requestURL}`, {
        method: 'GET',
      });

      dispatch({
        type: 'GET_DATA_COUNT_SUCCEEDED',
        data,
      });
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const fetchMediaLib = async () => {
    await Promise.all([fetchMediaLibFiles(), fetchMediaLibFilesCount()]);
  };

  const fetchMediaLibFiles = async () => {
    const requestURL = getRequestUrl('files');

    const compactParams = omitBy(
      params,
      param =>
        (typeof param === 'string' && param === '') || (Array.isArray(param) && param.length === 0)
    );
    const paramsToSend = generateSearchFromFilters(compactParams);

    try {
      const data = await request(`${requestURL}?${paramsToSend}`, {
        method: 'GET',
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const addFilesToUpload = ({ target: { value } }) => {
    console.log(value);
    dispatch({
      type: 'ADD_FILES_TO_UPLOAD',
      filesToUpload: value,
    });
  };

  const handleUploadFiles = async () => {
    dispatch({
      type: 'SET_FILES_UPLOADING_STATE',
    });

    const requests = filesToUpload.map(
      async ({ file, fileInfo, originalIndex, abortController }) => {
        console.log(file);
        const formData = new FormData();
        const headers = {};
        formData.append('files', file);
        formData.append('fileInfo', JSON.stringify(fileInfo));

        try {
          const data = await request(
            `/${pluginId}`,
            {
              method: 'POST',
              headers,
              body: formData,
              signal: abortController.signal,
            },
            false,
            false
          );

          dispatch({
            type: 'REMOVE_FILE_TO_UPLOAD',
            fileIndex: originalIndex,
            addToSelectedFiles: data,
            multiple,
          });
        } catch (err) {
          const errorMessage = get(
            err,
            ['response', 'payload', 'message', '0', 'messages', '0', 'message'],
            null
          );

          dispatch({
            type: 'SET_FILE_ERROR',
            fileIndex: originalIndex,
            errorMessage,
          });
        }
      }
    );

    await Promise.all(requests);
  };

  return (
    <InputModalStepperContext.Provider
      value={{
        ...reducerState,
        setParam,
        handleFileSelection,
        handleAllFileSelection,
        fetchMediaLib,
        removeFilter,
        goTo,
        handleClose,
        handleUploadFiles,
        handleCancelFileToUpload,
        handleSetCropResult,
        addFilesToUpload,
        handleCleanFilesError,
        multiple,
        handleGoToEditNewFile,
        handleResetFileToEdit,
        handleRemoveFileToUpload,
        handleFileToEditChange,
      }}
    >
      {children}
    </InputModalStepperContext.Provider>
  );
};

InputModalStepperProvider.propTypes = {
  isOpen: PropTypes.bool,
  children: PropTypes.node.isRequired,
  multiple: PropTypes.bool.isRequired,
};

InputModalStepperProvider.defaultProps = {
  isOpen: false,
};

export default InputModalStepperProvider;
