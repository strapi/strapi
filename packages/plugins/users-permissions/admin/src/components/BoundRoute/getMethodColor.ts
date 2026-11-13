const methodColors = new Map([
  ['POST', 'success'],
  ['GET', 'secondary'],
  ['PUT', 'warning'],
  ['DELETE', 'danger'],
]);

/** Returns the design-system colors for an HTTP method badge. */
const getMethodColor = (verb: string) => {
  const color = methodColors.get(verb) ?? 'neutral';

  return {
    text: `${color}600`,
    border: `${color}200`,
    background: `${color}100`,
  };
};

export { getMethodColor };
