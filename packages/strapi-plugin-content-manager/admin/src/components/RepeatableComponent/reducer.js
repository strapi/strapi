import { fromJS } from 'immutable';
import getTrad from '../../utils/getTrad';

const initialState = fromJS({ collapses: [] });

const getMax = arr => {
  if (arr.size === 0) {
    return -1;
  }

  return Math.max.apply(
    Math,
    arr.toJS().map(o => o._temp__id)
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NEW_FIELD':
      return state.update('collapses', list => {
        return list
          .map(obj => obj.update('isOpen', () => false))
          .push(fromJS({ isOpen: true, _temp__id: getMax(list) + 1 }));
      });
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
          strapi.notification.toggle({
            type: 'warning',
            message: getTrad('components.repeatable.reorder.error'),
          });

          return oldList;
        }

        return newList;
      });
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
