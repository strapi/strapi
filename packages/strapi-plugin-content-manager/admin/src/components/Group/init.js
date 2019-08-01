import { fromJS } from 'immutable';
import { isArray } from 'lodash';

function init(initialState, groupValues) {
  return initialState.update('collapses', list => {
    if (isArray(groupValues)) {
      return fromJS(
        groupValues.map((_, index) => ({
          isOpen: index === groupValues.length - 1,
        }))
      );
    }

    return list;
  });
}

export default init;
