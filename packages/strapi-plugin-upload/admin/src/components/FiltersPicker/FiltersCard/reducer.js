import { fromJS } from 'immutable';
import moment from 'moment';

import filtersForm from './utils/filtersForm';

const initialState = fromJS({
  name: 'created_at',
  filter: '=',
  value: moment(),
  filtersForm,
});

function reducer(state, action) {
  switch (action.type) {
    case 'ON_CHANGE': {
      const { name, value, defaultValue } = action;

      if (name === 'name') {
        return state
          .update(name, () => value)
          .update('filter', () => state.getIn(['filtersForm', value, 'defaultFilter']))
          .update(
            'value',
            () => defaultValue || state.getIn(['filtersForm', value, 'defaultValue'])
          );
      }

      return state.update(name, () => value);
    }
    case 'HANDLE_CUSTOM_TIMESTAMPS': {
      return state.set('name', action.timestamps[0]).updateIn(['filtersForm'], filtersFormMap =>
        filtersFormMap
          .set(action.timestamps[1], filtersFormMap.get('updated_at'))
          .set(action.timestamps[0], filtersFormMap.get('created_at'))
          .delete('created_at')
          .delete('updated_at')
      );
    }
    case 'RESET_FORM':
      return initialState
        .set(
          'name',
          state
            .get('filtersForm')
            .keySeq()
            .first()
        )
        .update('filtersForm', () => state.get('filtersForm'));
    default:
      return state;
  }
}

export default reducer;
export { initialState };
