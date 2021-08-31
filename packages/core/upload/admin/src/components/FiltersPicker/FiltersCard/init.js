const init = (initialState, timestamps) => {
  const [created_at, updated_at] = timestamps;

  const filtersForm = Object.keys(initialState.filtersForm).reduce((acc, current) => {
    // The timestamps can be customised so we need to update them
    if (current === 'created_at') {
      acc[created_at] = initialState.filtersForm.created_at;

      return acc;
    }

    if (current === 'updated_at') {
      acc[updated_at] = initialState.filtersForm.updated_at;

      return acc;
    }

    acc[current] = initialState.filtersForm[current];

    return acc;
  }, {});

  return {
    ...initialState,
    name: created_at,
    filtersForm,
  };
};

export default init;
