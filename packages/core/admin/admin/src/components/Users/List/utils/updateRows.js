const updateRows = (array, shouldSelect) =>
  array.map(row => {
    return { ...row, _isChecked: shouldSelect };
  });

export default updateRows;
