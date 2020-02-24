import { fromJS } from 'immutable';
import reducer from '../reducer';

describe('UPLOAD | containers | ModalStepper | reducer', () => {
  describe('default action', () => {
    it('should return the initialState', () => {
      const action = {
        type: 'TEST',
      };
      const initialState = fromJS({
        test: true,
      });

      expect(reducer(initialState, action)).toEqual(initialState);
    });
  });

  describe('ADD_FILES_TO_UPLOAD', () => {
    it('should add the files to the empty filesToUpload array and update the current step', () => {
      const action = {
        type: 'ADD_FILES_TO_UPLOAD',
        filesToUpload: {
          0: { ok: true },
          1: { ok: false },
        },
        nextStep: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
        filesToUpload: [],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { ok: false },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add the files to the (not empty) filesToUpload array and update the current step', () => {
      const action = {
        type: 'ADD_FILES_TO_UPLOAD',
        filesToUpload: {
          0: { test: true },
          1: { test: false },
        },
        nextStep: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
        ],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should work if the filesToUpload is empty', () => {
      const action = {
        type: 'ADD_FILES_TO_UPLOAD',
        filesToUpload: {},
        nextStep: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
        ],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('CLEAN_FILES_ERROR', () => {
    it('should not change the filesToUpload property if it is empty', () => {
      const action = {
        type: 'CLEAN_FILES_ERROR',
      };
      const state = fromJS({
        currentStep: 'test',
        filesToUpload: [],
      });

      expect(reducer(state, action)).toEqual(state);
    });

    it('should remove the errors of all files from the filesToUploadArray', () => {
      const action = {
        type: 'CLEAN_FILES_ERROR',
      };
      const state = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: true,
            errorMessage: 'error1',
            isUploading: false,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: true,
            errorMessage: 'error2',
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: true,
            errorMessage: 'error3',
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });

      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GO_TO', () => {
    it('should update the current step', () => {
      const action = {
        type: 'GO_TO',
        to: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
      });
      const expected = fromJS({
        currentStep: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_EDIT_NEW_FILE', () => {
    it('should update the filesToUploadList with the fileToEdit data', () => {
      const action = {
        type: 'ON_SUBMIT_EDIT_NEW_FILE',
      };
      const state = fromJS({
        currentStep: 'edit-new',
        filesToUpload: [
          {
            originalIndex: 0,
            file: {
              name: 'test',
            },
          },
          {
            originalIndex: 1,
            file: {
              test: false,
            },
          },
          {
            originalIndex: 2,
            file: {
              name: 'test2',
            },
          },
        ],
        fileToEdit: {
          originalIndex: 1,
          file: {
            test: true,
            otherTest: true,
          },
        },
      });
      const expected = fromJS({
        currentStep: 'edit-new',
        filesToUpload: [
          {
            originalIndex: 0,
            file: {
              name: 'test',
            },
          },
          {
            originalIndex: 1,
            file: {
              test: true,
              otherTest: true,
            },
          },
          {
            originalIndex: 2,
            file: {
              name: 'test2',
            },
          },
        ],
        fileToEdit: null,
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('REMOVE_FILE_TO_UPLOAD', () => {
    it('should remove the file from the filesToUpload array', () => {
      const action = {
        type: 'REMOVE_FILE_TO_UPLOAD',
        fileIndex: 1,
      };
      const state = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: true,
            errorMessage: 'error1',
            isUploading: false,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: true,
            errorMessage: 'error2',
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: true,
            errorMessage: 'error3',
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: true,
            errorMessage: 'error1',
            isUploading: false,
            originalIndex: 0,
          },

          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: true,
            errorMessage: 'error3',
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_PROPS', () => {
    it('should return the initialState', () => {
      const action = { type: 'RESET_PROPS' };
      const state = { test: true };
      const expected = fromJS({
        currentStep: 'browse',
        filesToUpload: [],
        fileToEdit: null,
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_CROP_RESULT', () => {
    it('should update the fileToEditEntry with the passed data', () => {
      const action = {
        type: 'SET_CROP_RESULT',
        blob: {
          test: true,
        },
      };
      const state = fromJS({
        fileToEdit: {
          originalIndex: 1,
          file: null,
        },
      });
      const expected = fromJS({
        fileToEdit: {
          originalIndex: 1,
          file: {
            test: true,
          },
        },
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FILE_ERROR', () => {
    it('should update the specified file error', () => {
      const action = {
        type: 'SET_FILE_ERROR',
        fileIndex: 1,
        errorMessage: 'size limit exceeded',
      };
      const state = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 2,
          },
        ],
      });

      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: true,
            errorMessage: 'size limit exceeded',
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 2,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FILE_TO_EDIT', () => {
    it('should set the fileToEdit key with the file at the passed index from the filesToUpload list', () => {
      const action = {
        type: 'SET_FILE_TO_EDIT',
        fileIndex: 1,
      };
      const state = fromJS({
        fileToEdit: null,
        filesToUpload: [
          {
            originalIndex: 0,
            file: {
              name: 'test0',
            },
          },
          {
            originalIndex: 1,
            file: {
              name: 'test1',
            },
          },
          {
            originalIndex: 2,
            file: {
              name: 'test2',
            },
          },
        ],
      });
      const expected = fromJS({
        fileToEdit: {
          originalIndex: 1,
          file: {
            name: 'test1',
          },
        },
        filesToUpload: [
          {
            originalIndex: 0,
            file: {
              name: 'test0',
            },
          },
          {
            originalIndex: 1,
            file: {
              name: 'test1',
            },
          },
          {
            originalIndex: 2,
            file: {
              name: 'test2',
            },
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_FILES_UPLOADING_STATE', () => {
    it('should change all the isUploading keys of the filesToUpload to true', () => {
      const action = {
        type: 'SET_FILES_UPLOADING_STATE',
      };
      const state = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: 'test',
            isUploading: true,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 2,
          },
        ],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { ok: true },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 0,
          },
          {
            abortController: new AbortController(),
            file: { test: true },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 1,
          },
          {
            abortController: new AbortController(),
            file: { test: false },
            hasError: false,
            errorMessage: null,
            isUploading: true,
            originalIndex: 2,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
