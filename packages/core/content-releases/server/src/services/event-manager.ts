interface ReleaseEventServiceState {
  destroyListenerCallbacks: (() => void)[];
}

const createEventManagerService = () => {
  const state: ReleaseEventServiceState = {
    destroyListenerCallbacks: [],
  };

  return {
    addDestroyListenerCallback(destroyListenerCallback: () => void) {
      state.destroyListenerCallbacks.push(destroyListenerCallback);
    },

    destroyAllListeners() {
      if (!state.destroyListenerCallbacks.length) {
        return;
      }

      state.destroyListenerCallbacks.forEach((destroyListenerCallback) => {
        destroyListenerCallback();
      });
    },
  };
};

export default createEventManagerService;
