import { fromJS } from 'immutable';
import { formatLayout } from '../../utils/layout';

const initialState = fromJS({
  initialData: {},
  isLoading: true,
  itemFormType: '',
  itemNameToSelect: '',
  modifiedData: {},
});

const getSize = type => {
  switch (type) {
    case 'boolean':
    case 'date':
    case 'datetime':
      return 4;
    case 'json':
    case 'group':
    case 'WYSIWYG':
      return 12;
    default:
      return 6;
  }
};

const reducer = (state, action) => {
  const layoutPath = ['modifiedData', 'layouts', 'edit'];
  const { dragIndex, hoverIndex, dragRowIndex, hoverRowIndex } = action;

  switch (action.type) {
    case 'FORMAT_LAYOUT': {
      const newList = formatLayout(state.getIn(layoutPath).toJS());

      return state.updateIn(layoutPath, () => fromJS(newList));
    }
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('isLoading', () => false)
        .update('itemNameToSelect', () => action.itemNameToSelect)
        .update('itemFormType', () => action.itemFormType)
        .update('modifiedData', () => fromJS(action.data));
    case 'MOVE_ROW':
      return state.updateIn(layoutPath, list => {
        return list
          .delete(dragRowIndex)
          .insert(hoverRowIndex, state.getIn([...layoutPath, dragRowIndex]));
      });
    case 'ON_ADD_DATA': {
      const size = getSize(
        state.getIn([
          'modifiedData',
          'schema',
          'attributes',
          action.name,
          'type',
        ])
      );
      const listSize = state.getIn(layoutPath).size;
      const newList = state
        .getIn(layoutPath)
        .updateIn([listSize - 1, 'rowContent'], list => {
          if (list) {
            return list.push({
              name: action.name,
              size,
            });
          }

          return fromJS([{ name: action.name, size }]);
        });
      const formattedList = formatLayout(newList.toJS());

      // NOTE we could use the diddrop part here but it causes an unecessary rerender...
      // NOTE2: it would be great later to remove the didDrop key that is used to reformat the layout with the _TEMP_ divs

      return state.updateIn(layoutPath, () => fromJS(formattedList));
    }
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );

    case 'REMOVE_FIELD': {
      const row = state.getIn([...layoutPath, action.rowIndex, 'rowContent']);
      let newState;
      // Delete the entire row if length is one or if lenght is equal to 2 and the second element is the hidden div used to make the dnd exp smoother
      if (
        row.size === 1 ||
        (row.size == 2 && row.getIn([1, 'name']) === '_TEMP_')
      ) {
        newState = state
          .updateIn(layoutPath, list => list.delete(action.rowIndex))
          .update('didDrop', v => !v);
      } else {
        newState = state.updateIn(
          [...layoutPath, action.rowIndex, 'rowContent'],
          list => list.delete(action.fieldIndex)
        );
      }

      const updatedList = formatLayout(newState.getIn(layoutPath).toJS());

      return state.updateIn(layoutPath, () => fromJS(updatedList));
    }
    case 'REORDER_DIFF_ROW': {
      const newState = state
        .updateIn([...layoutPath, dragRowIndex, 'rowContent'], list => {
          return list.remove(dragIndex);
        })
        .updateIn([...layoutPath, hoverRowIndex, 'rowContent'], list => {
          return list.insert(
            hoverIndex,
            state.getIn([...layoutPath, dragRowIndex, 'rowContent', dragIndex])
          );
        });
      const updatedList = formatLayout(newState.getIn(layoutPath).toJS());

      return state.updateIn(layoutPath, () => fromJS(updatedList));
    }
    case 'REORDER_ROW': {
      const newState = state.updateIn(
        [...layoutPath, dragRowIndex, 'rowContent'],
        list => {
          return list.delete(dragIndex).insert(hoverIndex, list.get(dragIndex));
        }
      );

      const updatedList = formatLayout(newState.getIn(layoutPath).toJS());

      return state.updateIn(layoutPath, () => fromJS(updatedList));
    }
    case 'RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'SET_FIELD_TO_SELECT':
      return state
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => action.formType);
    default:
      return state;
  }
};

export default reducer;
export { initialState };
