import type { GetSettings } from '../../../../shared/contracts/settings';

type InitialState = {
  initialData: GetSettings.Response['data']['data'];
  modifiedData: GetSettings.Response['data']['data'];
};

const init = (initialState: InitialState) => {
  return initialState;
};

export default init;
