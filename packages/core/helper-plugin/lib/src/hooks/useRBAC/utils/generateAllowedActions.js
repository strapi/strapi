import upperFirst from 'lodash/upperFirst';

const generateAllowedActions = (permissionsNames) =>
  permissionsNames.reduce((acc, current) => {
    acc[`can${upperFirst(current)}`] = false;

    return acc;
  }, {});

export default generateAllowedActions;
