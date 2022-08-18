const getActionsState = (dataToCheck, value, exceptions = []) => {
  return Object.values(dataToCheck).every((actions) =>
    Object.keys(actions).every((action) => {
      if (exceptions.includes(action)) {
        return actions[action] === !value;
      }

      return actions[action] === value;
    })
  );
};

export default getActionsState;
