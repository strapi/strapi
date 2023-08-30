const init = (plugins) => {
  return {
    plugins: Object.keys(plugins).reduce((acc, current) => {
      acc[current] = { ...plugins[current] };

      return acc;
    }, {}),
  };
};

export default init;
