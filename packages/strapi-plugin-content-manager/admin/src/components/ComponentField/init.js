import { fromJS } from 'immutable';
import { isArray } from 'lodash';

function init(initialState, componentValues) {
  return initialState.update('collapses', list => {
    if (isArray(componentValues)) {
      return fromJS(
        componentValues.map(() => ({
          isOpen: false,
        }))
      );
    }

    return list;
  });
}

export default init;
