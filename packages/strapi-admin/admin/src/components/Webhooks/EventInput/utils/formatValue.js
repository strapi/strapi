const formatValue = value =>
  value.reduce((acc, curr) => {
    const key = curr.split('.')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

export default formatValue;
