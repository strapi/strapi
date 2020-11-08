import { fromJS } from 'immutable';

const initialState = fromJS({
  labelForm: {},
  labelToEdit: '',
  initialData: {},
  isLoading: true,
  modifiedData: {},
});

const reducer = (state, action) => {
  const layoutPath = ['modifiedData', 'layouts', 'list'];

  switch (action.type) {
    case 'ADD_FIELD':
      return state.updateIn(layoutPath, list => list.push(action.item));
    case 'GET_DATA_SUCCEEDED':
      return state
        .update('initialData', () => fromJS(action.data))
        .update('isLoading', () => false)
        .update('modifiedData', () => fromJS(action.data));
    case 'MOVE_FIELD':
      return state.updateIn(['modifiedData', 'layouts', 'list'], list => {
        return list
          .delete(action.originalIndex)
          .insert(action.atIndex, list.get(action.originalIndex));
      });
    case 'ON_CHANGE':
      return state.updateIn(
        ['modifiedData', ...action.keys.split('.')],
        () => action.value
      );
    case 'ON_CHANGE_LABEL_METAS':
      return state.updateIn(['labelForm', action.name], () => action.value);
    case 'ON_RESET':
      return state.update('modifiedData', () => state.get('initialData'));
    case 'REMOVE_FIELD': {
      const defaultSortByPath = ['modifiedData', 'settings', 'defaultSortBy'];
      const defaultSortBy = state.getIn(defaultSortByPath);
      const attrPath = ['modifiedData', 'layouts', 'list', action.index];
      const attrToBeRemoved = state.getIn(attrPath);

      const firstAttr = state.getIn(['modifiedData', 'layouts', 'list', 1]);
      const firstAttrType = state.getIn([
        'modifiedData',
        'schema',
        'attributes',
        firstAttr,
        'type',
      ]);
      const attrToSelect =
        firstAttrType !== 'media' && firstAttrType !== 'richtext'
          ? firstAttr
          : 'id';

      return state
        .removeIn(['modifiedData', 'layouts', 'list', action.index])
        .updateIn(defaultSortByPath, () => {
          if (attrToBeRemoved === defaultSortBy) {
            return attrToSelect;
          }

          return defaultSortBy;
        });
    }
    case 'SET_LABEL_TO_EDIT':
      return state
        .update('labelToEdit', () => action.labelToEdit)
        .updateIn(['labelForm', 'label'], () =>
          state.getIn([
            'modifiedData',
            'metadatas',
            action.labelToEdit,
            'list',
            'label',
          ])
        )
        .updateIn(['labelForm', 'sortable'], () =>
          state.getIn([
            'modifiedData',
            'metadatas',
            action.labelToEdit,
            'list',
            'sortable',
          ])
        );
    case 'UNSET_LABEL_TO_EDIT':
      return state
        .update('labelToEdit', () => '')
        .update('labelForm', () => fromJS({}));
    case 'SUBMIT_LABEL_FORM': {
      const metaPath = [
        'modifiedData',
        'metadatas',
        state.get('labelToEdit'),
        'list',
      ];

      return state
        .updateIn([...metaPath, 'label'], () =>
          state.getIn(['labelForm', 'label'])
        )
        .updateIn([...metaPath, 'sortable'], () =>
          state.getIn(['labelForm', 'sortable'])
        );
    }
    case 'SUBMIT_SUCCEEDED':
      return state.update('initialData', () => state.get('modifiedData'));
    default:
      return state;
  }
};

export default reducer;
export { initialState };
