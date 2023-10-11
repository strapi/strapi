export const getPadding = (index: number) => {
  const isOdd = index % 2 === 1;
  const paddingLeft = isOdd ? 2 : 0;
  const paddingRight = isOdd ? 0 : 2;

  return { paddingLeft, paddingRight };
};
