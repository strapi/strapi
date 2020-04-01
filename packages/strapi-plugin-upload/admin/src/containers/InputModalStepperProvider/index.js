import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { request, generateSearchFromFilters } from 'strapi-helper-plugin';
import { get } from 'lodash';
import axios from 'axios';
import pluginId from '../../pluginId';
import {
  getFilesToDownload,
  getRequestUrl,
  compactParams,
  createNewFilesToUploadArray,
} from '../../utils';
import InputModalStepperContext from '../../contexts/InputModal/InputModalDataManager';
import init from './init';
import reducer, { initialState } from './reducer';

/* eslint-disable indent */

const InputModalStepperProvider = ({
  allowedTypes,
  children,
  initialFilesToUpload,
  initialFileToEdit,
  initialFilters,
  isOpen,
  multiple,
  onInputMediaChange,
  selectedFiles,
  step,
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, state =>
    init({
      ...state,
      currentStep: step,
      fileToEdit: initialFileToEdit,
      selectedFiles: Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles],
      filesToUpload: initialFilesToUpload
        ? createNewFilesToUploadArray(initialFilesToUpload).map((file, index) => ({
            ...file,
            originalIndex: index,
          }))
        : [],
      params: {
        ...state.params,
        filters: initialFilters,
      },
    })
  );
  const { params, filesToUpload, fileToEdit } = reducerState;

  useEffect(() => {
    if (isOpen) {
      fetchMediaLib();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, params]);

  const downloadFiles = async () => {
    const files = getFilesToDownload(filesToUpload);

    try {
      await Promise.all(
        files.map(file => {
          const { source } = file;

          return axios
            .get(file.fileURL, {
              headers: new Headers({ Origin: window.location.origin, mode: 'cors' }),
              responseType: 'blob',
              cancelToken: source.token,
            })
            .then(({ data }) => {
              const createdFile = new File([data], file.fileURL, {
                type: data.type,
              });

              dispatch({
                type: 'FILE_DOWNLOADED',
                blob: createdFile,
                originalIndex: file.originalIndex,
                fileTempId: file.tempId,
              });
            })
            .catch(err => {
              console.error('fetch file error', err);

              dispatch({
                type: 'SET_FILE_TO_DOWNLOAD_ERROR',
                originalIndex: file.originalIndex,
                fileTempId: file.tempId,
              });
            });
        })
      );
    } catch (err) {
      // Silent
    }
  };

  const handleRemoveFileToUpload = fileIndex => {
    dispatch({
      type: 'REMOVE_FILE_TO_UPLOAD',
      fileIndex,
    });
  };

  const handleClickNextButton = () => {
    dispatch({
      type: 'ADD_URLS_TO_FILES_TO_DOWNLOAD',
      nextStep: 'upload',
    });
  };

  const handleFileToEditChange = ({ target: { name, value } }) => {
    let val = value;
    let type = 'ON_CHANGE';

    if (name === 'url') {
      val = value.split('\n');
      type = 'ON_CHANGE_URLS_TO_DOWNLOAD';
    }

    dispatch({
      type,
      keys: name,
      value: val,
    });
  };

  const handleMoveAsset = (dragIndex, hoverIndex) => {
    dispatch({
      type: 'MOVE_ASSET',
      dragIndex,
      hoverIndex,
    });
  };

  const toggleModalWarning = () => {
    dispatch({
      type: 'TOGGLE_MODAL_WARNING',
    });
  };

  const submitEditExistingFile = () => {
    dispatch({
      type: 'ON_SUBMIT_EDIT_EXISTING_FILE',
    });
  };

  const handleEditExistingFile = file => {
    dispatch({
      type: 'EDIT_EXISTING_FILE',
      file,
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

  const handleFileSelection = ({ target: { name } }) => {
    dispatch({
      type: 'ON_FILE_SELECTION',
      id: name,
    });
  };

  const handleAllFilesSelection = () => {
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
      type: 'SET_NEW_FILE_TO_EDIT',
      fileIndex,
    });

    goTo('edit-new');
  };

  const handleGoToEditFile = fileId => {
    dispatch({
      type: 'SET_FILE_TO_EDIT',
      fileId,
    });

    goTo('edit');
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

  const handleFormDisabled = isFormDisabled => {
    dispatch({
      type: 'SET_FORM_DISABLED',
      isFormDisabled,
    });
  };

  const handleAbortUpload = () => {
    const { abortController } = fileToEdit;

    abortController.abort();

    dispatch({
      type: 'ON_ABORT_UPLOAD',
    });
  };

  const handleCancelFileToUpload = fileIndex => {
    const fileToCancel = get(filesToUpload, fileIndex, {});

    const { source } = fileToCancel;

    // Cancel upload
    if (source) {
      // Cancel dowload file upload with axios
      source.cancel('Operation canceled by the user.');
    } else {
      // Cancel uplodad file with fetch
      fileToCancel.abortController.abort();
    }

    handleRemoveFileToUpload(fileIndex);
  };

  const fetchMediaLibFilesCount = async () => {
    const requestURL = getRequestUrl('files/count');

    try {
      return await request(`${requestURL}`, {
        method: 'GET',
      });
    } catch (err) {
      console.error(err);
      strapi.notification.error('notification.error');

      return 0;
    }
  };

  const fetchMediaLib = async () => {
    const [files, count] = await Promise.all([fetchMediaLibFiles(), fetchMediaLibFilesCount()]);
    dispatch({
      type: 'GET_DATA_SUCCEEDED',
      files,
      countData: count,
    });
  };

  const fetchMediaLibFiles = async () => {
    const requestURL = getRequestUrl('files');

    const compactedParams = compactParams(params);
    const paramsToSend = generateSearchFromFilters(compactedParams);

    try {
      return await request(`${requestURL}?${paramsToSend}`, {
        method: 'GET',
      });
    } catch (err) {
      console.error(err);
      strapi.notification.error('notification.error');

      return [];
    }
  };

  const addFilesToUpload = ({ target: { value } }) => {
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
        const formData = new FormData();
        const headers = {};
        formData.append('files', file);
        formData.append('fileInfo', JSON.stringify(fileInfo));

        try {
          const uploadedFile = await request(
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

          const filesToSelect = uploadedFile.filter(file => {
            const fileType = file.mime.split('/')[0];

            if (allowedTypes.includes('file') && !['video', 'image'].includes(fileType)) {
              return true;
            }

            return allowedTypes.includes(fileType);
          });

          dispatch({
            type: 'REMOVE_FILE_TO_UPLOAD',
            fileIndex: originalIndex,
            addToSelectedFiles: filesToSelect,
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
        addFilesToUpload,
        downloadFiles,
        fetchMediaLib,
        goTo,
        handleAbortUpload,
        handleAllFilesSelection,
        handleCancelFileToUpload,
        handleClickNextButton,
        handleCleanFilesError,
        handleClose,
        handleEditExistingFile,
        handleFileSelection,
        handleFileToEditChange,
        handleFormDisabled,
        handleGoToEditFile,
        handleGoToEditNewFile,
        handleRemoveFileToUpload,
        handleResetFileToEdit,
        handleSetCropResult,
        handleUploadFiles,
        moveAsset: handleMoveAsset,
        multiple,
        onInputMediaChange,
        removeFilter,
        setParam,
        submitEditExistingFile,
        toggleModalWarning,
      }}
    >
      {children}
    </InputModalStepperContext.Provider>
  );
};

InputModalStepperProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialFileToEdit: PropTypes.object,
  initialFilters: PropTypes.arrayOf(PropTypes.object),
  initialFilesToUpload: PropTypes.object,
  isOpen: PropTypes.bool,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  selectedFiles: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  step: PropTypes.string.isRequired,
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
};

InputModalStepperProvider.defaultProps = {
  initialFileToEdit: null,
  initialFilters: [],
  initialFilesToUpload: null,
  isOpen: false,
  onInputMediaChange: () => {},
  selectedFiles: null,
  allowedTypes: [],
};

export default InputModalStepperProvider;
