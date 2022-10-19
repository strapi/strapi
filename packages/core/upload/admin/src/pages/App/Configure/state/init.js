import { initialState } from './reducer';

const init = (configData) => {
  return {
    ...initialState,
    initialData: configData,
    modifiedData: configData,
  };
};
export default init;
