import produce from 'immer';
import { sortBy } from 'lodash';

const initialState = {
  isLoading: true,
  data: {},
  providers: [],
};

const reducer = (state, action) =>
  // eslint-disable-next-line consistent-return
  produce(state, draftState => {
    switch (action.type) {
      case 'GET_DATA': {
        draftState.isLoading = true;
        break;
      }

      case 'GET_DATA_SUCCEEDED': {
        draftState.isLoading = false;
        draftState.data = action.data;
        draftState.providers = sortBy(
          Object.keys(action.data).reduce((acc, current) => {
            const { icon: iconName, enabled } = action.data[current];
            const icon = iconName === 'envelope' ? ['fas', 'envelope'] : ['fab', iconName];

            acc.push({ name: current, icon, enabled });

            return acc;
          }, []),
          'name'
        );

        break;
      }
      case 'GET_DATA_ERROR': {
        drafState.isLoading = true;
        break;
      }
      case 'RESET_PROPS':
        return initialState;
      default: {
        return draftState;
      }
    }
  });

export default reducer;
export { initialState };
