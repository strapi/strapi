import merge from 'lodash/merge';

const init = (initialState, projectSettingsStored) => {
  const copyInitialState = merge(initialState, {
    menuLogo: {
      display: projectSettingsStored.menuLogo,
    },
    authLogo: {
      display: projectSettingsStored.authLogo,
    },
  });

  return copyInitialState;
};

export default init;
