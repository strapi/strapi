import { get } from 'lodash';

const togglePermissions = (action, state, exceptions = []) => {
  const pathToValue = ['modifiedData', ...action.keys];
  const oldValues = get(state, pathToValue, {});
  const updatedValues = Object.keys(oldValues).reduce((acc, current) => {
    if (exceptions.includes(current)) {
      acc[current] = !action.value;
    } else {
      acc[current] = action.value;
    }

    return acc;
  }, {});

  return { pathToValue, updatedValues };
};

export default togglePermissions;
