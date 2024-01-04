const moveFields = <TValue>(initialValue: TValue[], from: number, to: number, value: TValue) => {
  const returnedValue = initialValue.slice();

  returnedValue.splice(from, 1);
  returnedValue.splice(to, 0, value);

  return returnedValue;
};

export { moveFields };
