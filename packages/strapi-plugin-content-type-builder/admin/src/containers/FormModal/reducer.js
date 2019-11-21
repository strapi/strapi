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
      const { attributeType, nameToSetForRelation } = action;
      let dataToSet;

      if (attributeType === 'text') {
        dataToSet = { type: 'string' };
      } else if (attributeType === 'number' || attributeType === 'date') {
        dataToSet = {};
      } else if (attributeType === 'media') {
        dataToSet = { type: 'media', multiple: true };
      } else if (attributeType === 'enumeration') {
        dataToSet = { type: 'enumeration', enum: [] };
      } else if (attributeType === 'relation') {
        dataToSet = {
          name: nameToSetForRelation,
          type: 'relation',
          nature: 'oneWay',
          targetAttribute: '-',
        };
      } else {
        dataToSet = { type: attributeType, default: null };
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
