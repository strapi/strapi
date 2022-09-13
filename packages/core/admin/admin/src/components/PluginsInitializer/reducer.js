import produce from 'immer';
import set from 'lodash/set';

const initialState = {
  plugins: null,
};

const reducer = (state = initialState, action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draftState) => {
    switch (action.type) {
      case 'SET_PLUGIN_READY': {
        set(draftState, ['plugins', action.pluginId, 'isReady'], true);
        break;
      }
      default:
        return draftState;
    }
  });

export { initialState };
export default reducer;
