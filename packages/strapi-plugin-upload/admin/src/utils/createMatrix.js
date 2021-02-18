const createMatrix = refArray => {
  const maxNumberOfColumns = 4;
  const matrix = [];

  let row = [];
  let start = 0;

  for (let i = 0; i < refArray.length; i++) {
    // Check if the index is the last element
    if (i % maxNumberOfColumns === 0 && i !== 0) {
      for (let j = start; j < i; j++) {
        row.push(refArray[j]);
        start = i;
      }

      matrix.push({ key: matrix.length, rowContent: row });
      row = [];
    }
  }

  for (let i = start; i < refArray.length; i++) {
    row.push(refArray[i]);

    if (i === refArray.length - 1) {
      matrix.push({ key: matrix.length, rowContent: row });
    }
  }

  return matrix;
};

export default createMatrix;
