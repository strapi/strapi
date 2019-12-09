const getColor = (isOverRemove, isSelected, isOverEditBlock) => {
  if (isOverRemove) {
    return '#ffa784';
  } else if (isSelected || isOverEditBlock) {
    return '#aed4fb';
  } else {
    return '#E3E9F3';
  }
};

export default getColor;
