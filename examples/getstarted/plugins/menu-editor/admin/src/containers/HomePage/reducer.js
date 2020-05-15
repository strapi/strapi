import { fromJS } from 'immutable';

import { ON_CHANGE } from './constants';

const initialState = fromJS({
  createItemForm: {
    labelName: { value: '', key: 'name' },
    labelState: { value: 'Viditelná', key: 'state' },
    labelType: { value: 'Běžná položka', key: 'type' },
    labelLinkToPage: { value: '', key: 'link' },
  },
});

function reducer(state = initialState, action) {
  console.log('---ACTION', action);
  switch (action.type) {
    case 'ON_CHANGE':
      return state
        .updateIn(['createItemForm', action.name, 'value'], () => action.value)
        .updateIn(['createItemForm', action.name, 'name'], () => action.name.name);
    case 'ON_SAVEITEM':
      return initialState;
    default:
      return state;
  }
}

export default reducer;
export { initialState };
