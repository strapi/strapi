import { fromJS } from 'immutable';
import moment from 'moment';

const initialState = fromJS({
  name: 'created_at',
  filter: '=',
  value: moment(),
});

function reducer(state, action) {
  switch (action.type) {
    case 'ON_CHANGE':
      return state.update(action.name, () => action.value);
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

export default reducer;
export { initialState };
