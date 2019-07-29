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
  const layoutPathEdit = ['modifiedData', 'layouts', 'edit'];
  const { dragIndex, hoverIndex, dragRowIndex, hoverRowIndex } = action;
  const getFieldType = name =>
    state.getIn(['modifiedData', 'schema', 'attributes', name, 'type']);

  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('isLoading', () => false)
        .update('itemNameToSelect', () => action.itemNameToSelect)
        .update('itemFormType', () => action.itemFormType)
        .update('modifiedData', () => fromJS(action.data));
    case 'MOVE_ROW':
      return state.updateIn(layoutPathEdit, list => {
        return list
          .delete(dragRowIndex)
          .insert(
            hoverRowIndex,
            state.getIn([...layoutPathEdit, dragRowIndex])
          );
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
      const listSize = state.getIn(layoutPathEdit).size;
      const newList = state
        .getIn(layoutPathEdit)
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

      return state
        .updateIn(layoutPathEdit, () => fromJS(formattedList))
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => getFieldType(action.name) || '');
    }
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );

    case 'REMOVE_FIELD': {
      const row = state.getIn([
        ...layoutPathEdit,
        action.rowIndex,
        'rowContent',
      ]);
      let newState;
      let fieldNameToDelete;
      // Delete the entire row if length is one or if lenght is equal to 2 and the second element is the hidden div used to make the dnd exp smoother
      if (
        row.size === 1 ||
        (row.size == 2 && row.getIn([1, 'name']) === '_TEMP_')
      ) {
        fieldNameToDelete = state.getIn([
          ...layoutPathEdit,
          action.rowIndex,
          'rowContent',
          0,
          'name',
        ]);
        newState = state.updateIn(layoutPathEdit, list =>
          list.delete(action.rowIndex)
        );
      } else {
        fieldNameToDelete = state.getIn([
          ...layoutPathEdit,
          action.rowIndex,
          'rowContent',
          action.fieldIndex,
          'name',
        ]);

        newState = state.updateIn(
          [...layoutPathEdit, action.rowIndex, 'rowContent'],
          list => list.delete(action.fieldIndex)
        );
      }

      const updatedList = fromJS(
        formatLayout(newState.getIn(layoutPathEdit).toJS())
      );

      if (state.get('itemNameToSelect') === fieldNameToDelete) {
        const firstField =
          updatedList.getIn([0, 'rowContent', 0, 'name']) || '';

        return state
          .updateIn(layoutPathEdit, () => updatedList)
          .update('itemNameToSelect', () => firstField)
          .update('itemFormType', () => getFieldType(firstField) || '');
      }

      return state.updateIn(layoutPathEdit, () => updatedList);
    }
    case 'REORDER_DIFF_ROW': {
      const newState = state
        .updateIn([...layoutPathEdit, dragRowIndex, 'rowContent'], list => {
          return list.remove(dragIndex);
        })
        .updateIn([...layoutPathEdit, hoverRowIndex, 'rowContent'], list => {
          return list.insert(
            hoverIndex,
            state.getIn([
              ...layoutPathEdit,
              dragRowIndex,
              'rowContent',
              dragIndex,
            ])
          );
        });
      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    case 'REORDER_ROW': {
      const newState = state.updateIn(
        [...layoutPathEdit, dragRowIndex, 'rowContent'],
        list => {
          return list.delete(dragIndex).insert(hoverIndex, list.get(dragIndex));
        }
      );

      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    case 'RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'SET_FIELD_TO_SELECT':
      return state
        .update('itemNameToSelect', () => action.name)
        .update('itemFormType', () => action.formType);
    case 'SUBMIT_SUCCEEDED':
      return state.update('initialData', () => state.get('modifiedData'));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
