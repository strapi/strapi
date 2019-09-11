import { fromJS } from 'immutable';
import { get } from 'lodash';
import filterLanguages from './utils/filterLanguages';

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
    case 'ADD_NEW_LANGUAGE': {
      const languageToAdd = state.get('selectedLanguage');
      const updatedModifiedData = state
        .update('modifiedData', list =>
          list.push(
            fromJS({ name: languageToAdd.toLowerCase(), active: false })
          )
        )
        .get('modifiedData');

      const updatedSelectOptions = getSelectOptions(
        filterLanguages(
          updatedModifiedData.toJS(),
          state.get('allLanguages').toJS()
        )
      );

      return state
        .update('modifiedData', () => updatedModifiedData)
        .update('selectedLanguage', () => updatedSelectOptions[0].value)
        .update('selectOptions', () => fromJS(updatedSelectOptions));
    }
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
