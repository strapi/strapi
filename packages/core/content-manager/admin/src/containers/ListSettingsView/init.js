import { fromJS } from 'immutable';

const init = (initialState, layout) => {
  return fromJS({
    ...initialState.toJS(),
    initialData: layout,
    modifiedData: layout,
  });
};

export default init;
