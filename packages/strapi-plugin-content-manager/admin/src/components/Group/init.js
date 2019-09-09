import { fromJS } from 'immutable';
import { isArray } from 'lodash';

function init(initialState, groupValues) {
  return initialState.update('collapses', list => {
    if (isArray(groupValues)) {
      return fromJS(
        groupValues.map(() => ({
          isOpen: false,
        }))
      );
    }

    return list;
  });
}

export default init;
