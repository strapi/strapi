const createDataObject = arr =>
  arr.reduce((acc, current) => {
    acc[current.uid] = current;

    return acc;
  }, {});

export default createDataObject;
