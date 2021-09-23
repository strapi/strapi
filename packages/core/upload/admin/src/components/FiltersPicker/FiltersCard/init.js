const init = (initialState, timestamps) => {
  const [createdAt, updatedAt] = timestamps;

  const filtersForm = Object.keys(initialState.filtersForm).reduce((acc, current) => {
    // The timestamps can be customised so we need to update them
    if (current === 'createdAt') {
      acc[createdAt] = initialState.filtersForm.createdAt;

      return acc;
    }

    if (current === 'updatedAt') {
      acc[updatedAt] = initialState.filtersForm.updatedAt;

      return acc;
    }

    acc[current] = initialState.filtersForm[current];

    return acc;
  }, {});

  return {
    ...initialState,
    name: createdAt,
    filtersForm,
  };
};

export default init;
