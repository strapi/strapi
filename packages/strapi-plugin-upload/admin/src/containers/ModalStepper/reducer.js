import { fromJS } from 'immutable';
import createNewFilesToUploadArray from './utils/createNewFilesToUploadArray';

const initialState = fromJS({
  currentStep: 'browse',
  filesToUpload: [],
  fileToEdit: null,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_FILES_TO_UPLOAD':
      return state
        .update('filesToUpload', list =>
          list
            .concat(fromJS(createNewFilesToUploadArray(action.filesToUpload)))
            .map((data, index) => data.set('originalIndex', index))
        )
        .update('currentStep', () => action.nextStep);
    case 'CLEAN_FILES_ERROR':
      return state.update('filesToUpload', list =>
        list.map(data => {
          return data.set('hasError', false).set('errorMessage', null);
        })
      );
    case 'GO_TO':
      return state.update('currentStep', () => action.to);
    case 'ON_CHANGE':
      return state.updateIn(['fileToEdit', ...action.keys.split('.')], () => action.value);
    case 'ON_SUBMIT_EDIT_NEW_FILE': {
      const originalIndex = state.getIn(['fileToEdit', 'originalIndex']);

      return state
        .updateIn(['filesToUpload', originalIndex], () => state.get('fileToEdit'))
        .update('fileToEdit', () => null);
    }
    case 'REMOVE_FILE_TO_UPLOAD':
      return state.update('filesToUpload', list => {
        return list.filter(data => data.get('originalIndex') !== action.fileIndex);
      });
    case 'RESET_FILE_TO_EDIT':
      return state.update('fileToEdit', () => null);
    case 'RESET_PROPS':
      return initialState;
    case 'SET_CROP_RESULT': {
      return state.updateIn(['fileToEdit', 'file'], () => fromJS(action.blob));
    }
    case 'SET_FILE_ERROR':
      return state.update('filesToUpload', list => {
        return list.map(data => {
          if (data.get('originalIndex') === action.fileIndex) {
            return data
              .set('isUploading', false)
              .set('hasError', true)
              .set('errorMessage', action.errorMessage);
          }

          return data;
        });
      });
    case 'SET_FILE_TO_EDIT':
      return state.update('fileToEdit', () => state.getIn(['filesToUpload', action.fileIndex]));
    case 'SET_FILES_UPLOADING_STATE':
      return state.update('filesToUpload', list =>
        list.map(data =>
          data
            .set('isUploading', true)
            .set('hasError', false)
            .set('errorMessage', null)
        )
      );

    default:
      return state;
  }
};

export default reducer;
export { initialState };
