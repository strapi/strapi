import generateAllowedActions from './utils/generateAllowedActions';

const init = (permissionsNames) => {
  const allowedActions = generateAllowedActions(permissionsNames);

  return { isLoading: true, allowedActions };
};

export default init;
