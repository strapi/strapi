const init = (initialState, shouldFetchData) => {
  return { ...initialState, isLoading: shouldFetchData };
};

export default init;
