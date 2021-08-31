import produce from 'immer';
import set from 'lodash/set';
import { createNewFilesToDownloadArray, createNewFilesToUploadArray } from '../../utils';

const initialState = {
  currentStep: 'browse',
  filesToUpload: [],
  filesToDownload: [],
  fileToEdit: null,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'ADD_FILES_TO_UPLOAD': {
        draftState.filesToUpload = [
          ...state.filesToUpload,
          ...createNewFilesToUploadArray(action.filesToUpload),
        ].map((data, index) => ({ ...data, originalIndex: index }));

        draftState.currentStep = action.nextStep;

        break;
      }
      case 'ADD_URLS_TO_FILES_TO_UPLOAD': {
        draftState.currentStep = action.nextStep;

        draftState.filesToUpload = [
          ...state.filesToUpload,
          ...createNewFilesToDownloadArray(state.filesToDownload, state.filesToUpload),
        ].map((data, index) => ({ ...data, originalIndex: index }));

        draftState.filesToDownload = [];

        break;
      }
      case 'CLEAN_FILES_ERROR': {
        state.filesToUpload.forEach((file, index) => {
          if (!file.tempId) {
            draftState.filesToUpload[index] = { ...file, hasError: false, errorMessage: null };
          }
        });

        break;
      }
      case 'FILE_DOWNLOADED': {
        state.filesToUpload.forEach((file, index) => {
          if (file.tempId === action.fileTempId) {
            draftState.filesToUpload[index] = { ...file, isDownloading: false, file: action.blob };
          }
        });

        break;
      }
      case 'GO_TO': {
        draftState.currentStep = action.to;
        break;
      }
      case 'INIT_FILE_TO_EDIT': {
        draftState.fileToEdit = action.fileToEdit;
        break;
      }
      case 'ON_ABORT_UPLOAD': {
        draftState.fileToEdit.isUploading = false;
        break;
      }
      case 'ON_CHANGE': {
        set(draftState, ['fileToEdit', ...action.keys.split('.')], action.value);
        break;
      }
      case 'ON_CHANGE_URLS_TO_DOWNLOAD': {
        draftState.filesToDownload = action.value;
        break;
      }
      case 'ON_SUBMIT_EDIT_EXISTING_FILE': {
        draftState.fileToEdit.isUploading = true;
        break;
      }
      case 'ON_SUBMIT_EDIT_NEW_FILE': {
        const { originalIndex } = state.fileToEdit;

        draftState.filesToUpload[originalIndex] = state.fileToEdit;
        draftState.fileToEdit = null;
        break;
      }
      case 'REMOVE_FILE_TO_UPLOAD': {
        draftState.filesToUpload = state.filesToUpload.filter(
          ({ originalIndex }) => originalIndex !== action.fileIndex
        );

        break;
      }
      case 'RESET_FILE_TO_EDIT': {
        draftState.fileToEdit = null;
        break;
      }
      case 'RESET_PROPS': {
        return initialState;
      }
      case 'SET_CROP_RESULT': {
        draftState.fileToEdit.file = action.blob;
        break;
      }
      case 'SET_FILE_ERROR': {
        state.filesToUpload.forEach((file, index) => {
          if (file.originalIndex === action.fileIndex) {
            draftState.filesToUpload[index] = {
              ...file,
              isUploading: false,
              hasError: true,
              errorMessage: action.errorMessage,
            };
          }
        });

        break;
      }
      case 'SET_FILE_TO_DOWNLOAD_ERROR': {
        state.filesToUpload.forEach((file, index) => {
          if (file.tempId === action.fileTempId) {
            draftState.filesToUpload[index] = {
              ...file,
              isDownloading: false,
              hasError: true,
              errorMessage: file.fileOriginalName,
            };
          }
        });

        break;
      }
      case 'SET_FILE_TO_EDIT': {
        draftState.fileToEdit = state.filesToUpload[action.fileIndex];
        break;
      }
      case 'SET_FILE_TO_EDIT_ERROR': {
        draftState.fileToEdit.hasError = true;
        draftState.fileToEdit.errorMessage = action.errorMessage;
        draftState.fileToEdit.isUploading = false;

        break;
      }
      case 'SET_FILES_UPLOADING_STATE': {
        state.filesToUpload.forEach((file, index) => {
          draftState.filesToUpload[index] = {
            ...file,
            isUploading: true,
            hasError: false,
            errorMessage: null,
          };
        });

        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
