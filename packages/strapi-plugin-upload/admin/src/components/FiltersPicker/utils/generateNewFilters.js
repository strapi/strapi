import { isArray, some } from 'lodash';
import moment from 'moment';

const generateNewFilters = (currentFilters, newFilter) => {
  const { value } = newFilter;

  let formattedValue = newFilter;

  if (isArray(value)) {
    // Add new filters if several values sent
    value.map(item => currentFilters.push({ ...newFilter, value: item }));
  } else {
    // moment format if datetime value
    if (value._isAMomentObject === true) {
      formattedValue.value = moment(value).format();
    }

    // Add new filter
    if (!some(currentFilters, formattedValue)) {
      currentFilters.push(formattedValue);
    }
  }

  return currentFilters;
};

export default generateNewFilters;
