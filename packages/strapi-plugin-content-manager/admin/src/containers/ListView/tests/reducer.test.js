import produce from 'immer';
import {
  getData,
  getDataSucceeded,
  onChangeBulk,
  onChangeBulkSelectall,
  onDeleteDataSucceeded,
  onDeleteSeveralDataSucceeded,
  resetProps,
  setModalLoadingState,
  toggleModalDelete,
  toggleModalDeleteAll,
} from '../actions';

import reducer from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | ListView | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      count: 0,
      data: [],
      didDeleteData: false,
      entriesToDelete: [],
      isLoading: true,
      showModalConfirmButtonLoading: false,
      showWarningDelete: false,
      showWarningDeleteAll: false,
    };
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const expected = state;

      expect(reducer(undefined, {})).toEqual(expected);
    });
  });

  describe('GET_DATA', () => {
    it('should return the initialState', () => {
      state.count = 1;
      state.data = ['test'];
      state.isLoading = false;

      const expected = produce(state, draft => {
        draft.count = 0;
        draft.data = [];
        draft.isLoading = true;
      });

      expect(reducer(state, getData())).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the data correctly', () => {
      const expected = produce(state, draft => {
        draft.count = 1;
        draft.data = ['test'];
        draft.isLoading = false;
      });

      expect(reducer(state, getDataSucceeded(1, ['test']))).toEqual(expected);
    });
  });

  describe('ON_CHANGE_BULK', () => {
    it('should add the data to the entriesToDelete if it is not already selected', () => {
      const target = {
        name: '13',
      };
      state.entriesToDelete = ['1'];

      const expected = produce(state, draft => {
        draft.entriesToDelete = ['1', '13'];
      });

      expect(reducer(state, onChangeBulk({ target }))).toEqual(expected);
    });

    it('should remove the data to the entriesToDelete if it is already selected', () => {
      const target = {
        name: '13',
      };
      state.entriesToDelete = ['1', '13', '14'];

      const expected = produce(state, draft => {
        draft.entriesToDelete = ['1', '14'];
      });

      expect(reducer(state, onChangeBulk({ target }))).toEqual(expected);
    });
  });

  describe('ON_CHANGE_BULK_SELECT_ALL', () => {
    it('should remove all the selected elements if the entriesToDelete array is not empty', () => {
      state.entriesToDelete = ['1', '13', '14'];

      const expected = produce(state, draft => {
        draft.entriesToDelete = [];
      });

      expect(reducer(state, onChangeBulkSelectall())).toEqual(expected);
    });

    it('should all all the elements if the entriesToDelete array is empty', () => {
      state.entriesToDelete = [];
      state.data = [
        {
          id: 1,
        },
        {
          id: '2',
        },
        {
          id: '3',
        },
      ];

      const expected = produce(state, draft => {
        draft.entriesToDelete = ['1', '2', '3'];
      });

      expect(reducer(state, onChangeBulkSelectall())).toEqual(expected);
    });
  });

  describe('ON_DELETE_DATA_SUCCEEDED', () => {
    it('should toggle the modal and set the didDeleteData to true', () => {
      state.showWarningDelete = true;

      const expected = produce(state, draft => {
        draft.showWarningDelete = false;
        draft.didDeleteData = true;
      });

      expect(reducer(state, onDeleteDataSucceeded())).toEqual(expected);
    });
  });

  describe('ON_DELETE_DATA_SEVERAL_DATA_SUCCEEDED', () => {
    it('should toggle the modal and set the didDeleteData to true', () => {
      state.showWarningDeleteAll = true;

      const expected = produce(state, draft => {
        draft.showWarningDeleteAll = false;
        draft.didDeleteData = true;
      });

      expect(reducer(state, onDeleteSeveralDataSucceeded())).toEqual(expected);
    });
  });

  describe('RESET_PROPS', () => {
    it('should return the initialState', () => {
      state.count = 1;
      state.data = ['test'];
      state.isLoading = false;

      const expected = produce(state, draft => {
        draft.count = 0;
        draft.data = [];
        draft.isLoading = true;
      });

      expect(reducer(state, resetProps())).toEqual(expected);
    });
  });

  describe('SET_MODAL_LOADING_STATE', () => {
    it('should set the showModalConfirmButtonLoading to true', () => {
      state.showModalConfirmButtonLoading = false;

      const expected = produce(state, draft => {
        draft.showModalConfirmButtonLoading = true;
      });

      expect(reducer(state, setModalLoadingState())).toEqual(expected);
    });
  });

  describe('TOGGLE_MODAL_DELETE', () => {
    it('should set the showModalConfirmButtonLoading to false', () => {
      state.showModalConfirmButtonLoading = true;

      const expected = produce(state, draft => {
        draft.showModalConfirmButtonLoading = false;
        draft.showWarningDelete = true;
      });

      expect(reducer(state, toggleModalDelete())).toEqual(expected);
    });

    it('should set the didDeleteData to false if showWarningDelete is false', () => {
      state.showWarningDelete = false;
      state.didDeleteData = true;

      const expected = produce(state, draft => {
        draft.didDeleteData = false;
        draft.showWarningDelete = true;
      });

      expect(reducer(state, toggleModalDelete())).toEqual(expected);
    });

    it('should not change the didDeleteData to false if showWarningDelete is truthy', () => {
      state.showWarningDelete = true;
      state.didDeleteData = true;

      const expected = produce(state, draft => {
        draft.didDeleteData = true;
        draft.showWarningDelete = false;
      });

      expect(reducer(state, toggleModalDelete())).toEqual(expected);
    });

    it('should set the entriesToDelete to an empty array', () => {
      state.showWarningDelete = false;
      state.entriesToDelete = ['1'];

      const expected = produce(state, draft => {
        draft.showWarningDelete = true;
        draft.entriesToDelete = [];
      });

      expect(reducer(state, toggleModalDelete())).toEqual(expected);
    });
  });

  describe('TOGGLE_MODAL_DELETE_ALL', () => {
    it('should set the showModalConfirmButtonLoading to false', () => {
      state.showModalConfirmButtonLoading = true;

      const expected = produce(state, draft => {
        draft.showModalConfirmButtonLoading = false;
        draft.showWarningDeleteAll = true;
      });

      expect(reducer(state, toggleModalDeleteAll())).toEqual(expected);
    });

    it('should set the didDeleteData to false if showWarningDeleteAll is falsy', () => {
      state.showWarningDeleteAll = false;
      state.didDeleteData = true;

      const expected = produce(state, draft => {
        draft.didDeleteData = false;
        draft.showWarningDeleteAll = true;
      });

      expect(reducer(state, toggleModalDeleteAll())).toEqual(expected);
    });

    it('should not change the didDeleteData to false if showWarningDeleteAll is truthy', () => {
      state.showWarningDeleteAll = true;
      state.didDeleteData = true;

      const expected = produce(state, draft => {
        draft.didDeleteData = true;
        draft.showWarningDeleteAll = false;
      });

      expect(reducer(state, toggleModalDeleteAll())).toEqual(expected);
    });
  });
});
