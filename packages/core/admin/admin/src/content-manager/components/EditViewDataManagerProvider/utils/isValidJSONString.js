const isValidJSONString = value => {
  if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
    try {
      JSON.parse(value);

      return true;
    } catch {
      return false;
    }
  }

  return false;
};

export default isValidJSONString;
