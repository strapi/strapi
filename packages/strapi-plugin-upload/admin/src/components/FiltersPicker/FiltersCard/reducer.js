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
      const {
        timestamps: [created_at, updated_at],
      } = action;

      return state
        .update('name', () => created_at)
        .updateIn(['filtersForm'], object => {
          return object.keySeq().reduce((acc, current) => {
            if (current === 'created_at' && created_at !== 'created_at') {
              return acc.set(created_at, object.get('created_at')).remove('created_at');
            }

            if (current === 'updated_at' && updated_at !== 'updated_at') {
              return acc.set(updated_at, object.get('updated_at')).remove('updated_at');
            }

            return acc;
          }, object);
        });
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
