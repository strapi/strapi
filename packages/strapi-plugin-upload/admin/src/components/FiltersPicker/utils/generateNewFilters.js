import { some } from 'lodash';
import moment from 'moment';

const generateNewFilters = (currentFilters, newFilter) => {
  const { value } = newFilter;

  let formattedValue = newFilter;

  // moment format if datetime value
  if (value._isAMomentObject === true) {
    formattedValue.value = moment(value).format();
  }

  // Add new filter
  if (!some(currentFilters, formattedValue)) {
    currentFilters.push(formattedValue);
  }

  return currentFilters;
};

export default generateNewFilters;
