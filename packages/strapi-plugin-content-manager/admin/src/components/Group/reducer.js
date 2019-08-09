import { fromJS } from 'immutable';

const initialState = fromJS({ collapses: [], collapsesToOpen: [] });

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_NEW_FIELD':
      return state.update('collapses', list => {
        return list
          .map(obj => obj.update('isOpen', () => false))
          .push(fromJS({ isOpen: true }));
      });
    case 'COLLAPSE_ALL':
      return state
        .update('collapsesToOpen', () => fromJS([]))
        .update('collapses', list =>
          list.map(obj => obj.update('isOpen', () => false))
        );
    case 'OPEN_COLLAPSES_THAT_HAVE_ERRORS':
      return state
        .update('collapsesToOpen', () => fromJS(action.collapsesToOpen))
        .update('collapses', list => {
          return list.map((obj, index) => {
            if (action.collapsesToOpen.indexOf(index.toString()) !== -1) {
              return obj.update('isOpen', () => true);
            }

            return obj.update('isOpen', () => false);
          });
        });
    case 'TOGGLE_COLLAPSE':
      return state.update('collapses', list => {
        return list.map((obj, index) => {
          if (index === action.index) {
            return obj.update('isOpen', v => !v);
          }

          if (
            state
              .get('collapsesToOpen')
              .toJS()
              .indexOf(index.toString()) !== -1
          ) {
            return obj;
          }

          return obj.update('isOpen', () => false);
        });
      });

    case 'REMOVE_COLLAPSE':
      return state
        .removeIn(['collapses', action.index])
        .update('collapses', list => list.map(obj => obj.set('isOpen', false)))
        .update('collapses', list => {
          if (action.shouldAddEmptyField) {
            return list.push(fromJS({ isOpen: true }));
          }

          return list;
        });
    default:
      return state;
  }
}

export default reducer;
export { initialState };
