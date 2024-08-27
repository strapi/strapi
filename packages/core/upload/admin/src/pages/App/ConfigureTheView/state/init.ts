import type { Configuration } from '../../../../../../shared/contracts/configuration';

export type InitialStateType = {
  initialData: Partial<Configuration>;
  modifiedData: Partial<Configuration>;
};

const initialState: InitialStateType = {
  initialData: {},
  modifiedData: {},
};

const init = (configData: Configuration) => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export { init, initialState };
