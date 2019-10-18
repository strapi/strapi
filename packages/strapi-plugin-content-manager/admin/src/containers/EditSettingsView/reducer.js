import { fromJS } from 'immutable';
import { cloneDeep, set } from 'lodash';
import { createLayout, formatLayout, getInputSize } from '../../utils/layout';

const initialState = fromJS({
  labelForm: {},
  labelToEdit: '',
  initialData: {},
  isLoading: true,
  modifiedData: {},
});

const reducer = (state, action) => {
  const layoutPathEdit = ['modifiedData', 'layouts', 'edit'];
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED': {
      const data = cloneDeep(action.data);

      set(
        data,
        ['layouts', 'edit'],
        formatLayout(createLayout(data.layouts.edit))
      );

      return state
        .update('initialData', () => fromJS(data || {}))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(data || {}));
    }
    case 'MOVE_ROW':
      return state.updateIn(layoutPathEdit, list => {
        return list
          .delete(action.dragRowIndex)
          .insert(
            action.hoverRowIndex,
            state.getIn([...layoutPathEdit, action.dragRowIndex])
          );
      });
    case 'ON_ADD_DATA': {
      const size = getInputSize(
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

      return state.updateIn(layoutPathEdit, () => fromJS(formattedList));
    }
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys],
        () => action.value
      );
    case 'ON_RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'REMOVE_FIELD': {
      const row = state.getIn([
        ...layoutPathEdit,
        action.rowIndex,
        'rowContent',
      ]);
      let newState;

      // Delete the entire row if length is one or if lenght is equal to 2 and the second element is the hidden div used to make the dnd exp smoother
      if (
        row.size === 1 ||
        (row.size == 2 && row.getIn([1, 'name']) === '_TEMP_')
      ) {
        newState = state.updateIn(layoutPathEdit, list =>
          list.delete(action.rowIndex)
        );
      } else {
        newState = state.updateIn(
          [...layoutPathEdit, action.rowIndex, 'rowContent'],
          list => list.delete(action.fieldIndex)
        );
      }
      const updatedList = fromJS(
        formatLayout(newState.getIn(layoutPathEdit).toJS())
      );

      return state.updateIn(layoutPathEdit, () => updatedList);
    }
    case 'REORDER_DIFF_ROW': {
      const newState = state
        .updateIn(
          [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
          list => {
            return list.remove(action.dragIndex);
          }
        )
        .updateIn(
          [...layoutPathEdit, action.hoverRowIndex, 'rowContent'],
          list => {
            return list.insert(
              action.hoverIndex,
              state.getIn([
                ...layoutPathEdit,
                action.dragRowIndex,
                'rowContent',
                action.dragIndex,
              ])
            );
          }
        );

      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    case 'REORDER_ROW': {
      const newState = state.updateIn(
        [...layoutPathEdit, action.dragRowIndex, 'rowContent'],
        list => {
          return list
            .delete(action.dragIndex)
            .insert(action.hoverIndex, list.get(action.dragIndex));
        }
      );

      const updatedList = formatLayout(newState.getIn(layoutPathEdit).toJS());

      return state.updateIn(layoutPathEdit, () => fromJS(updatedList));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
