import { fromJS } from 'immutable';
import { get } from 'lodash';

const initialState = fromJS({
  allLanguages: {},
  initialData: [],
  modifiedData: [],
  selectOptions: [],
  selectedLanguage: '',
});
const getSelectOptions = obj =>
  get(obj, ['sections', '0', 'items', '0', 'items'], []);

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED': {
      const selectOptions = getSelectOptions(action.availableLanguages);
      return state
        .update('allLanguages', () => fromJS(action.allLanguages))
        .update('modifiedData', () => fromJS(action.languages))
        .update('initialData', () => fromJS(action.languages))
        .update('selectOptions', () => fromJS(selectOptions))
        .update('selectedLanguage', () => selectOptions[0].value);
    }
    case 'ON_CHANGE':
      return state.update('selectedLanguage', () => action.value);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
