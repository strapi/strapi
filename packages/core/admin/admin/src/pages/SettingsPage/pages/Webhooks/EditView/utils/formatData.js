const cleanData = (data) => {
  return { ...data, headers: unformatHeaders(data.headers) };
};

const unformatHeaders = (headers) => {
  return headers.reduce((acc, current) => {
    const { key, value } = current;

    if (key !== '') {
      return {
        ...acc,
        [key]: value,
      };
    }

    return acc;
  }, {});
};

export default cleanData;
