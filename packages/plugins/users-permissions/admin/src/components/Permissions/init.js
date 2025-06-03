const init = (initialState, permissions) => {
  const collapses = Object.keys(permissions)
    .sort()
    .map((name) => ({ name, isOpen: false }));

  return { ...initialState, collapses };
};

export default init;
