import { fromJS } from 'immutable';
import moment from 'moment';

const initialState = fromJS({
  name: 'created_at',
  filter: '=',
  value: moment(),
});

function reducer(state, action) {
  switch (action.type) {
    case 'ON_CHANGE': {
      const { defaultValue, name, value } = action;

      if (name === 'name') {
        return state
          .update(name, () => value)
          .update('filter', () => '=')
          .update('value', () => defaultValue);
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
