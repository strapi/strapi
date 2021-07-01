const getColor = (isOverRemove, isSelected, isOverEditBlock) => {
  if (isOverRemove) {
    return '#ffa784';
  }
  if (isSelected || isOverEditBlock) {
    return '#aed4fb';
  }

  return '#e9eaeb';
};

export default getColor;
