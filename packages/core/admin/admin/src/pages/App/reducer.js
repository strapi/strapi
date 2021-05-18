/* eslint-disable consistent-return */
import produce from 'immer';
import packageJSON from '../../../../package.json';
import { GET_INFOS_DATA_SUCCEEDED, GET_DATA_SUCCEEDED } from './constants';

const packageVersion = packageJSON.version;

const initialState = {
  appInfos: {},
  autoReload: false,
  currentEnvironment: 'development',
  isLoading: true,
  strapiVersion: packageVersion,
  uuid: false,
};

const appReducer = (state = initialState, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case GET_INFOS_DATA_SUCCEEDED: {
        if (action.data.strapiVersion !== state.strapiVersion) {
          console.error(
            `It seems that the built version ${packageVersion} is different than your project's one (${action.data.strapiVersion})`
          );
          console.error('Please delete your `.cache` and `build` folders and restart your app');
        }

        draftState.appInfos = action.data;
        draftState.autoReload = action.data.autoReload;
        draftState.currentEnvironment = action.data.currentEnvironment;
        break;
      }
      case GET_DATA_SUCCEEDED: {
        draftState.isLoading = false;
        draftState.uuid = action.data.uuid;
        break;
      }

      default:
        return draftState;
    }
  });

export default appReducer;
