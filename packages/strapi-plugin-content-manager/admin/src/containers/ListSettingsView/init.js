import { fromJS } from 'immutable';

const unformatLayout = layout => {
  const list = layout.layouts.list.map(({ name }) => name);
  const editRelations = layout.layouts.editRelations.map(({ name }) => name);
  const edit = layout.layouts.edit.map(row =>
    row.map(({ name, size }) => ({
      name,
      size,
    }))
  );

  return { ...layout, layouts: { edit, editRelations, list } };
};

const init = (initialState, layout) => {
  const unformattedLayout = unformatLayout(layout.contentType);

  return fromJS({
    ...initialState.toJS(),
    initialData: unformattedLayout,
    modifiedData: unformattedLayout,
  });
};

export default init;
