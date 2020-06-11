import { upperFirst } from 'lodash';

const init = (initialState, permissionsNames) => {
  const allowedActions = permissionsNames.reduce((acc, current) => {
    acc[`can${upperFirst(current)}`] = false;

    return acc;
  }, {});

  return { ...initialState, allowedActions };
};

export default init;
