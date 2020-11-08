import { fromJS } from 'immutable';
import { isArray } from 'lodash';

// Initialize all the fields of the component is the isOpen key to false
// The key will be used to control the open close state of the banner
function init(initialState, componentValue) {
  return initialState.update('collapses', list => {
    if (isArray(componentValue)) {
      return fromJS(
        componentValue.map((_, i) => ({
          isOpen: false,
          _temp__id: i,
        }))
      );
    }

    return list;
  });
}

export default init;
