export const getNumberOfDecimals = value => {
  if (value % 1 !== 0) {
    // value has decimals
    return value.toString().split('.')[1].length;
  }

  return 0;
};
