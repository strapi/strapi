import { fromJS } from 'immutable';
import createNewFilesToUploadArray from './utils/createNewFilesToUploadArray';

const initialState = fromJS({
  currentStep: 'browse',
  // currentStep: 'upload',
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
    case 'RESET_PROPS':
      return initialState;
    default:
      return state;
  }
};

export default reducer;
export { initialState };
