import produce from 'immer';
import { intersectionWith, differenceWith, unionWith, set, isEqual, toString } from 'lodash';

import {
  createNewFilesToDownloadArray,
  createNewFilesToUploadArray,
  formatFileForEditing,
  getType,
} from '../../utils';

const initialState = {
  allowedTypes: [],
  selectedFiles: [],
  files: [],
  filesToUpload: [],
  filesToDownload: [],
  fileToEdit: null,
  currentTab: null,
  params: {
    _limit: 10,
    _start: 0,
    _q: '',
    filters: [],
    _sort: null,
  },
  currentStep: 'list',
  isFormDisabled: false,
  isWarningDeleteOpen: false,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'ADD_FILES_TO_UPLOAD': {
        draftState.filesToUpload = [
          ...draftState.filesToUpload,
          ...createNewFilesToUploadArray(action.filesToUpload),
        ].map((fileToUpload, index) => ({
          ...fileToUpload,
          originalIndex: index,
        }));
        draftState.currentStep = action.nextStep;
        break;
      }
      case 'ADD_URLS_TO_FILES_TO_UPLOAD': {
        draftState.filesToUpload = [
          ...draftState.filesToUpload,
          ...createNewFilesToDownloadArray(draftState.filesToDownload, draftState.filesToUpload),
        ].map((fileToUpload, index) => ({
          ...fileToUpload,
          originalIndex: index,
        }));
        draftState.currentStep = action.nextStep;
        draftState.filesToDownload = [];

        break;
      }
      case 'CLEAN_FILES_ERROR': {
        draftState.filesToUpload.forEach((fileToUpload, index) => {
          draftState.filesToUpload[index] = {
            ...fileToUpload,
            hasError: false,
            errorMessage: null,
          };
        });
        break;
      }
      case 'CLEAR_FILES_TO_UPLOAD_AND_DOWNLOAD': {
        draftState.filesToUpload = [];
        draftState.filesToDownload = [];

        break;
      }
      case 'EDIT_EXISTING_FILE': {
        const index = draftState.selectedFiles.findIndex(
          selectedFile => selectedFile.id === action.file.id
        );

        if (index !== -1) {
          draftState.selectedFiles[index] = action.file;
        }
        break;
      }
      case 'FILE_DOWNLOADED': {
        const index = state.filesToUpload.findIndex(file => file.tempId === action.fileTempId);

        draftState.filesToUpload[index] = {
          ...draftState.filesToUpload[index],
          isDownloading: false,
          file: action.blob,
        };

        break;
      }
      case 'GET_DATA_SUCCEEDED': {
        draftState.files = action.files;
        draftState.count = action.countData.count;
        break;
      }
      case 'GO_TO': {
        draftState.currentStep = action.to;
        break;
      }
      case 'MOVE_ASSET': {
        const { dragIndex, hoverIndex } = action;
        const dragMedia = state.selectedFiles[dragIndex];

        draftState.selectedFiles.splice(dragIndex, 1);
        draftState.selectedFiles.splice(hoverIndex, 0, dragMedia);

        break;
      }
      case 'ON_ABORT_UPLOAD': {
        draftState.fileToEdit.isUploading = false;
        break;
      }
      case 'ON_CHANGE': {
        set(draftState.fileToEdit, action.keys.split('.'), action.value);
        break;
      }
      case 'ON_CHANGE_MODAL_TAB': {
        draftState.currentTab = action.to;
        break;
      }
      case 'ON_CHANGE_URLS_TO_DOWNLOAD': {
        set(draftState, ['filesToDownload'], action.value);
        break;
      }
      case 'ON_FILE_SELECTION': {
        const { id } = action;
        const stringId = toString(id);
        const fileIndex = state.selectedFiles.findIndex(file => toString(file.id) === stringId);

        if (fileIndex !== -1) {
          draftState.selectedFiles.splice(fileIndex, 1);
          break;
        }
        const fileToStore = state.files.find(file => file.id.toString() === stringId);

        if (fileToStore) {
          draftState.selectedFiles.push(fileToStore);
        }
        // Clean
        draftState.selectedFiles = draftState.selectedFiles.filter(file => file && file.id);
        break;
      }
      case 'ON_SUBMIT_EDIT_NEW_FILE': {
        const originalIndex = state.fileToEdit.originalIndex;
        draftState.filesToUpload[originalIndex] = draftState.fileToEdit;
        draftState.fileToEdit = null;
        break;
      }
      case 'ON_SUBMIT_EDIT_EXISTING_FILE': {
        draftState.fileToEdit.isUploading = true;
        break;
      }
      case 'REMOVE_FILE_TO_UPLOAD': {
        const canAddToSelectedFiles =
          action.multiple || (!action.multiple && draftState.selectedFiles.length === 0);

        if (action.addToSelectedFiles) {
          if (canAddToSelectedFiles) {
            draftState.selectedFiles = [...draftState.selectedFiles, ...action.addToSelectedFiles];
          }
          draftState.currentTab = 'selected';
        }

        const index = draftState.filesToUpload.findIndex(
          fileToUpload => fileToUpload.originalIndex === action.fileIndex
        );
        draftState.filesToUpload.splice(index, 1);
        break;
      }
      case 'REMOVE_FILTER': {
        const { filterToRemove } = action;

        draftState.params.filters.splice(filterToRemove, 1);
        break;
      }
      case 'RESET_PROPS': {
        if (action.defaultSort) {
          draftState.params._sort = action.defaultSort;
        } else {
          return initialState;
        }
        break;
      }
      case 'SET_CROP_RESULT': {
        draftState.fileToEdit.file = action.blob;
        break;
      }
      case 'SET_FILE_ERROR': {
        draftState.filesToUpload.forEach((fileToUpload, index) => {
          if (fileToUpload.originalIndex === action.fileIndex) {
            draftState.filesToUpload[index] = {
              ...draftState.filesToUpload[index],
              isUploading: false,
              hasError: true,
              errorMessage: action.errorMessage,
            };
          }
        });
        break;
      }
      case 'SET_FILE_TO_DOWNLOAD_ERROR': {
        const index = state.filesToUpload.findIndex(file => file.tempId === action.fileTempId);

        draftState.filesToUpload[index] = {
          ...draftState.filesToUpload[index],
          isDownloading: false,
          hasError: true,
          errorMessage: draftState.filesToUpload[index].fileOriginalName,
        };

        break;
      }
      case 'SET_FILE_TO_EDIT': {
        draftState.fileToEdit = formatFileForEditing(
          [...state.files, ...state.selectedFiles].find(
            file => file.id.toString() === action.fileId.toString()
          )
        );
        break;
      }
      case 'SET_FILE_TO_EDIT_ERROR': {
        draftState.fileToEdit.isUploading = false;
        draftState.fileToEdit.hasError = true;
        draftState.fileToEdit.errorMessage = action.errorMessage;
        break;
      }
      case 'SET_FILES_UPLOADING_STATE': {
        draftState.filesToUpload.forEach((fileToUpload, index) => {
          draftState.filesToUpload[index] = {
            ...fileToUpload,
            isUploading: true,
            hasError: false,
            errorMessage: null,
          };
        });
        break;
      }
      case 'SET_FORM_DISABLED': {
        draftState.isFormDisabled = action.isFormDisabled;
        break;
      }
      case 'SET_NEW_FILE_TO_EDIT': {
        draftState.fileToEdit = draftState.filesToUpload[action.fileIndex];
        break;
      }
      case 'SET_PARAM': {
        const { name, value } = action.param;

        if (name === 'filters') {
          const canAddFilter =
            intersectionWith(state.params.filters, [value], isEqual).length === 0;

          if (canAddFilter) {
            draftState.params._start = 0;
            draftState.params.filters.push(value);
          }
          break;
        }

        if (name === '_limit') {
          draftState.params._start = 0;
        }

        draftState.params[name] = value;
        break;
      }
      case 'TOGGLE_MODAL_WARNING': {
        draftState.isWarningDeleteOpen = !state.isWarningDeleteOpen;
        break;
      }
      case 'TOGGLE_SELECT_ALL': {
        const allowedFiles =
          state.allowedTypes.length > 0
            ? state.files.filter(file => state.allowedTypes.includes(getType(file.mime)))
            : state.files;
        const comparator = (first, second) => first.id === second.id;
        const isSelected =
          intersectionWith(state.selectedFiles, allowedFiles, comparator).length ===
          allowedFiles.length;

        if (isSelected) {
          draftState.selectedFiles = differenceWith(state.selectedFiles, state.files, comparator);
          break;
        }

        draftState.selectedFiles = unionWith(state.selectedFiles, allowedFiles, comparator);
        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
