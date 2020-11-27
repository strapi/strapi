/* eslint-disable consistent-return */
import produce from 'immer';

const concurrentEditingState = {
  lockInfo: null,
  hasLock: false,
  lockFetchingStatus: 'resolved',
  showModalForceLock: false,
  showModalLoader: false,
  isReadOnlyMode: false,
  shouldStartFetchingLock: false,
};

const concurrentEditingReducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case 'FETCH_LOCK': {
        draftState.lockFetchingStatus = 'fetching';
        draftState.hasLock = false;
        draftState.lockInfo = null;
        draftState.shouldStartFetchingLock = false;
        break;
      }
      case 'FETCH_LOCK_SUCCEEDED': {
        draftState.lockFetchingStatus = 'resolved';
        draftState.hasLock = action.success;
        draftState.lockInfo = action.lockInfo;
        break;
      }
      case 'SET_HAS_LOCK': {
        draftState.hasLock = action.hasLock;
        break;
      }
      case 'START_FETCHING_LOCK': {
        draftState.shouldStartFetchingLock = true;
        break;
      }
      case 'TOGGLE_MODAL_LOADER': {
        draftState.showModalLoader = !state.showModalLoader;
        break;
      }
      case 'TOGGLE_MODAL': {
        draftState.showModalForceLock = !state.showModalForceLock;
        break;
      }

      default:
        return draftState;
    }
  });

export default concurrentEditingReducer;
export { concurrentEditingState };
