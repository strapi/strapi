import { fromJS } from 'immutable';
import { get } from 'lodash';
import getFilterType from '../FilterPickerOption/utils';

function init(initialState, { name, type, options }) {
  // Create the first filter
  const [filter] = getFilterType(type);
  let value = '';

  if (type === 'boolean') {
    value = 'true';
  } else if (type === 'number') {
    value = 0;
  } else if (type === 'enumeration') {
    value = get(options, [0], '');
  }

  const initialFilter = { name, filter: filter.value, value };

  return initialState
    .update('initialData', () => fromJS([initialFilter]))
    .update('modifiedData', () => fromJS([initialFilter]));
}

export default init;
