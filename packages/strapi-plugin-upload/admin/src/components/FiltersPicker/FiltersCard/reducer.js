import { fromJS } from 'immutable';
import moment from 'moment';

import filters from './utils/filtersForm';

const initialState = fromJS({
  name: 'created_at',
  filter: '=',
  value: moment(),
});

function reducer(state, action) {
  switch (action.type) {
    case 'ON_CHANGE': {
      const { name, value } = action;

      if (name === 'name') {
        return state
          .update(name, () => value)
          .update('filter', () => '=')
          .update('value', () => filters[value].defaultValue);
      }

      return state.update(name, () => value);
    }
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

export default reducer;
export { initialState };
