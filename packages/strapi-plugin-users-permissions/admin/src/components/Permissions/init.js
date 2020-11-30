const init = (initialState, permissions) => {
  const collapses = Object.keys(permissions)
    .sort()
    .reduce((acc, current, index) => {
      return acc.concat({
        name: current,
        isOpen: index === 0,
      });
    }, []);

  return { ...initialState, collapses };
};

export default init;
