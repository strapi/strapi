import produce from 'immer';
import get from 'lodash/get';
import set from 'lodash/set';
import { dateToUtcTime } from '@strapi/helper-plugin';
import moment from 'moment';

import filtersForm from './utils/filtersForm';

const initialState = {
  name: 'created_at',
  filter: '=',
  value: dateToUtcTime(moment()),
  filtersForm,
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'ON_CHANGE': {
        set(draftState, [action.name], action.value);

        if (action.name === 'name') {
          const nextFilter = get(state, ['filtersForm', action.value, 'defaultFilter']);
          const nextValue = get(state, ['filtersForm', action.value, 'defaultValue']);

          draftState.filter = nextFilter;
          draftState.value = action.defaultValue || nextValue;
        }

        break;
      }
      case 'RESET_FORM': {
        draftState.name = Object.keys(filtersForm)[0];
        draftState.filter = '=';
        draftState.filtersForm = filtersForm;

        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;
export { initialState };
