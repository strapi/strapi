import { fromJS } from 'immutable';

const initialState = fromJS({ collapses: [], shouldOpenLastCollapse: false });

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NEW_FIELD':
      return state
        .update('collapses', list => {
          return list.map(obj => obj.update('isOpen', () => false));
        })
        .set('shouldOpenLastCollapse', true);
    case 'MOVE_COLLAPSE':
      return state.updateIn(['collapses'], list => {
        const oldList = list;
        const newList = list
          .delete(action.dragIndex)
          .insert(action.hoverIndex, state.getIn(['collapses', action.dragIndex]));

        // Fix for
        // https://github.com/react-dnd/react-dnd/issues/1368
        // https://github.com/frontend-collective/react-sortable-tree/issues/490
        if (oldList.size !== newList.size) {
          strapi.notification.error(
            "An error occured while reordering your component's field, please try again"
          );

          return oldList;
        }

        return newList;
      });
    case 'SET_COLLAPSES': {
      return state
        .update('collapses', () => {
          const collapsesLength = action.dataLength;

          const newCollapses = Array.from({ length: collapsesLength }).map((_, i) => {
            const shouldOpenLastCollapse = state.get('shouldOpenLastCollapse');
            const isOpen = shouldOpenLastCollapse && i === action.dataLength - 1;

            return {
              isOpen,
              _temp__id: i,
            };
          });

          return fromJS(newCollapses);
        })
        .set('shouldOpenLastCollapse', false);
    }
    case 'TOGGLE_COLLAPSE':
      return state.update('collapses', list => {
        return list.map((obj, index) => {
          if (index === action.index) {
            return obj.update('isOpen', v => !v);
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
};

export default reducer;
export { initialState };
