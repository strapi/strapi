import { fromJS } from 'immutable';
import { cloneDeep, set } from 'lodash';
import { formatLayout as updateLayout, createLayout } from '../../utils/layout';

const initialState = fromJS({
  labelForm: {},
  labelToEdit: '',
  initialData: {},
  isLoading: true,
  modifiedData: {},
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED': {
      const data = cloneDeep(action.data);

      set(
        data,
        ['layouts', 'edit'],
        updateLayout(createLayout(data.layouts.edit))
      );

      return state
        .update('initialData', () => fromJS(data || {}))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(data || {}));
    }
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'ON_RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
