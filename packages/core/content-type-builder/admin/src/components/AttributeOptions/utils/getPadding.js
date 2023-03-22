const getPadding = (index) => {
  const isOdd = index % 2 === 1;
  const paddingLeft = isOdd ? 2 : 0;
  const paddingRight = isOdd ? 0 : 2;

  return { paddingLeft, paddingRight };
};

export default getPadding;
