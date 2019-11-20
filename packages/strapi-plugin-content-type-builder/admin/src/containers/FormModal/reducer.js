import { fromJS } from 'immutable';

const initialState = fromJS({
  formErrors: {},
  modifiedData: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'RESET_PROPS':
      return initialState;
    case 'SET_ATTRIBUTE_DATA_SCHEMA': {
      const { attributeType } = action;
      let dataToSet;

      if (attributeType === 'text') {
        dataToSet = { type: 'string' };
      } else if (attributeType === 'number') {
        dataToSet = {};
      } else if (attributeType === 'media') {
        dataToSet = { type: 'media', multiple: true };
      } else {
        dataToSet = { type: attributeType };
      }

      return state.update('modifiedData', () => fromJS(dataToSet));
    }

    case 'SET_ERRORS':
      return state.update('formErrors', () => fromJS(action.errors));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
