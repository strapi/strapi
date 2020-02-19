import { fromJS } from 'immutable';
import createNewFilesToUploadArray from './utils/createNewFilesToUploadArray';

const initialState = fromJS({
  currentStep: 'browse',
  filesToUpload: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_FILES_TO_UPLOAD':
      return state
        .update('filesToUpload', list =>
          list.concat(fromJS(createNewFilesToUploadArray(action.filesToUpload)))
        )
        .update('currentStep', () => action.nextStep);
    case 'GO_TO':
      return state.update('currentStep', () => action.to);
    case 'REMOVE_FILE_TO_UPLOAD':
      return state.update('filesToUpload', list => {
        return list.filter(
          data => data.get('originalIndex') !== action.fileIndex
        );
      });
    case 'RESET_PROPS':
      return initialState;
    case 'SET_FILES_UPLOADING_STATE':
      return state.update('filesToUpload', list =>
        list.map(data => data.set('isUploading', true))
      );

    default:
      return state;
  }
};

export default reducer;
export { initialState };
