import { fromJS } from 'immutable';
import { dateToUtcTime } from 'strapi-helper-plugin';
import moment from 'moment';

import filtersForm from './utils/filtersForm';

const initialState = fromJS({
  name: 'created_at',
  filter: '=',
  value: dateToUtcTime(moment()),
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
