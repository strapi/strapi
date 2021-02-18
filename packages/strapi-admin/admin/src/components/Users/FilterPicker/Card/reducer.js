/* eslint-disable consistent-return */
import produce from 'immer';
import { get, set } from 'lodash';
import form from './utils/form';

const initialState = {
  modifiedData: {
    name: 'firstname',
    filter: '',
    value: '',
  },
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      case 'ON_CHANGE_NAME': {
        // Change the name
        set(draftState, ['modifiedData', 'name'], action.value);
        // Reset the default filter
        set(draftState, ['modifiedData', 'filter'], '');
        // Reset the default value
        const defaultValue = get(form, [action.value, 'defaultValue'], '');
        set(draftState, ['modifiedData', 'value'], defaultValue);
        break;
      }
      case 'RESET_FORM': {
        return initialState;
      }
      default:
        return draftState;
    }
  });

export { initialState, reducer };
