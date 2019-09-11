import { fromJS } from 'immutable';
import { get } from 'lodash';

const initialState = fromJS({
  availableLanguages: {},
  allLanguages: {},
  initialData: [],
  modifiedData: [],
  selectOptions: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('allLanguages', () => fromJS(action.allLanguages))
        .update('modifiedData', () => fromJS(action.languages))
        .update('initialData', () => fromJS(action.languages))
        .update('selectOptions', () =>
          fromJS(
            get(
              action.availableLanguages,
              ['sections', '0', 'items', '0', 'items'],
              []
            )
          )
        );
    default:
      return state;
  }
};

export default reducer;
export { initialState };
