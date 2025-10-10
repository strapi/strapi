import type { Configuration } from '../../../../../../shared/contracts/configuration';

export type InitialState = {
  initialData: Partial<Configuration>;
  modifiedData: Partial<Configuration>;
};

const initialState: InitialState = {
  initialData: {},
  modifiedData: {},
};

const init = (configData: InitialState['initialData']): InitialState => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export { init, initialState };
