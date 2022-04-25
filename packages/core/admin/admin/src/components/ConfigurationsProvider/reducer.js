/* eslint-disable consistent-return */
/*
 *
 * ConfigurationsProvider reducer
 *
 */

import produce from 'immer';

const initialState = {
  menuLogo: null,
};

const reducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'UPDATE_PROJECT_SETTINGS': {
        Object.assign(draftState, action.values);
        break;
      }
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
