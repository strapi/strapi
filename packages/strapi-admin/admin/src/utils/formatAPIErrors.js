const formatAPIError = ({ data }) => {
  try {
    return Object.keys(data).reduce((acc, current) => {
      const errorMessage = data[current][0];
      acc[current] = {
        id: errorMessage,
        defaultMessage: errorMessage,
      };

      return acc;
    }, {});
  } catch (err) {
    return {};
  }
};

export default formatAPIError;
