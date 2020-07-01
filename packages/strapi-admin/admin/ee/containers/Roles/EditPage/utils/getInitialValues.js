const getInitialValues = role => {
  return {
    name: role.name,
    description: role.description,
  };
};

export default getInitialValues;
