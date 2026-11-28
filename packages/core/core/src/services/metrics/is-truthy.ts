const isTruthy = (val: any) => {
  return [1, true].includes(val) || ['true', '1'].includes(String(val ?? '').toLowerCase());
};

export default isTruthy;
