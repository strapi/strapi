const init = (initialState, timestamps) => {
  const [created_at, updated_at] = timestamps;

  return initialState
    .update('name', () => created_at)
    .updateIn(['filtersForm'], object => {
      return object.keySeq().reduce((acc, current) => {
        if (current === 'created_at' && created_at !== 'created_at') {
          return acc.set(created_at, object.get('created_at')).remove('created_at');
        }

        if (current === 'updated_at' && updated_at !== 'updated_at') {
          return acc.set(updated_at, object.get('updated_at')).remove('updated_at');
        }

        return acc;
      }, object);
    });
};

export default init;
