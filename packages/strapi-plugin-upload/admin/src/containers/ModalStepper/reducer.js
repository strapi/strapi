import { fromJS } from 'immutable';

const initialState = fromJS({
  // currentStep: 'browse',
  currentStep: 'upload',
  filesToUpload: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_FILES_TO_UPLOAD':
      return state
        .update('filesToUpload', list =>
          list.concat(
            Object.keys(action.filesToUpload).reduce(
              (acc, current) => [...acc, action.filesToUpload[current]],
              []
            )
          )
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
