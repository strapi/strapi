const getSelectedIds = (rows, currentIndex) => {
  const selectedIds = [];

  for (let i = 0; i < rows.length; i++) {
    const { id, _isChecked } = rows[i];

    if (i !== currentIndex && _isChecked) {
      selectedIds.push(id);
    }

    if (i === currentIndex && !_isChecked) {
      selectedIds.push(id);
    }
  }

  return selectedIds;
};

export default getSelectedIds;
