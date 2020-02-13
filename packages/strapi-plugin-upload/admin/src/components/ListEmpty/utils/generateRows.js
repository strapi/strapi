const generateRows = numberOfRows => {
  const rows = Array.from({ length: numberOfRows }, (_, i) => {
    return {
      key: i,
      rows: Array.from({ length: 4 }, (_, i) => i),
    };
  });

  return rows;
};

export default generateRows;
