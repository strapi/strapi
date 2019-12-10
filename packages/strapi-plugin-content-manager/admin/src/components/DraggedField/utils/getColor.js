const getColor = (isOverRemove, isSelected, isOverEditBlock) => {
  if (isOverRemove) {
    return '#ffa784';
  } else if (isSelected || isOverEditBlock) {
    return '#aed4fb';
  } else {
    return '#E9EAEB ';
  }
};

export default getColor;
