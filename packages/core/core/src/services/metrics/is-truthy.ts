const isTruthy = (val: unknown) => {
  return [1, true].includes(val as never) || ['true', '1'].includes(String(val).toLowerCase());
};

export default isTruthy;
