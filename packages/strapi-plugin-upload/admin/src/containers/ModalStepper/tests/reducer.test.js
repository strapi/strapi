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
          0: { name: 'test1', ok: true },
          1: { name: 'test2', ok: false },
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
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            abortController: new AbortController(),
            file: { name: 'test2', ok: false },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test2',
            },
            originalName: 'test2',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
            tempId: null,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });

    it('should add the files to the (not empty) filesToUpload array and update the current step', () => {
      const action = {
        type: 'ADD_FILES_TO_UPLOAD',
        filesToUpload: {
          0: { name: 'test2', test: true },
          1: { name: 'test3', test: false },
        },
        nextStep: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
        ],
      });
      const expected = fromJS({
        currentStep: 'test',
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            abortController: new AbortController(),
            file: { name: 'test2', test: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test2',
            },
            originalName: 'test2',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 1,
            tempId: null,
          },
          {
            abortController: new AbortController(),
            file: { name: 'test3', test: false },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test3',
            },
            originalName: 'test3',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 2,
            tempId: null,
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
            tempId: null,
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
            tempId: null,
          },
        ],
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ADD_URLS_TO_FILES_TO_UPLOAD', () => {
    it('should add the files to the empty filesToUpload array and update the current step', () => {
      const action = {
        type: 'ADD_URLS_TO_FILES_TO_UPLOAD',
        nextStep: 'test',
      };
      const state = fromJS({
        currentStep: 'browse',
        filesToUpload: [],
        filesToDownload: ['http://www.un.com/photo-1', 'http://www.deux.com/photo-2'],
      });
      const firstURL = new URL('http://www.un.com/photo-1');
      const firstURLName = decodeURIComponent(
        firstURL.pathname.substring(firstURL.pathname.lastIndexOf('/') + 1)
      );
      const secondURL = new URL('http://www.deux.com/photo-2');
      const secondURLName = decodeURIComponent(
        secondURL.pathname.substring(secondURL.pathname.lastIndexOf('/') + 1)
      );
      const expected = fromJS({
        currentStep: 'test',
        filesToDownload: [],
        filesToUpload: [
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: firstURLName,
            },
            originalName: firstURLName,
            originalIndex: 0,
            fileURL: firstURL,
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 1,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: secondURLName,
            },
            originalName: secondURLName,
            originalIndex: 1,
            fileURL: secondURL,
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 2,
          },
        ],
      });

      const received = reducer(state, action);

      expect(received.get('currentStep')).toEqual(expected.get('currentStep'));
      expect(received.get('filesToDownload')).toEqual(expected.get('filesToDownload'));
      expect(received.get('filesToUpload').toJS()).toEqual(
        expect.arrayContaining([
          expect.objectContaining(expected.getIn(['filesToUpload', '0']).toJS()),
          expect.objectContaining(expected.getIn(['filesToUpload', '1']).toJS()),
        ])
      );
    });

    it('should add the files to the (not empty) filesToUpload array and update the current step', () => {
      const state = fromJS({
        currentStep: 'browse',
        filesToDownload: ['http://www.trois.com/photo-3', 'http://www.quatre.com/photo-4'],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            originalIndex: 1,
            fileURL: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 2,
          },
        ],
      });
      const action = {
        type: 'ADD_URLS_TO_FILES_TO_UPLOAD',
        nextStep: 'test',
      };
      const firstURL = new URL('http://www.trois.com/photo-3');
      const firstURLName = decodeURIComponent(
        firstURL.pathname.substring(firstURL.pathname.lastIndexOf('/') + 1)
      );
      const secondURL = new URL('http://www.quatre.com/photo-4');
      const secondURLName = decodeURIComponent(
        secondURL.pathname.substring(secondURL.pathname.lastIndexOf('/') + 1)
      );
      const expected = fromJS({
        currentStep: 'test',
        filesToDownload: [],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalName: 'test1',
            originalIndex: 1,
            fileURL: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 2,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: firstURLName,
            },
            originalName: firstURLName,
            originalIndex: 2,
            fileURL: firstURL,
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 3,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: secondURLName,
            },
            originalName: secondURLName,
            originalIndex: 3,
            fileURL: secondURL,
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 4,
          },
        ],
      });

      const received = reducer(state, action);

      expect(received.get('currentStep')).toEqual(expected.get('currentStep'));
      expect(received.get('filesToDownload')).toEqual(expected.get('filesToDownload'));
      expect(received.get('filesToUpload').toJS()).toEqual(
        expect.arrayContaining([
          expect.objectContaining(expected.getIn(['filesToUpload', '0']).toJS()),
          expect.objectContaining(expected.getIn(['filesToUpload', '1']).toJS()),
          expect.objectContaining(expected.getIn(['filesToUpload', '2']).toJS()),
          expect.objectContaining(expected.getIn(['filesToUpload', '3']).toJS()),
        ])
      );
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

    it('should not change the data containing a defined tempId key', () => {
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
            tempId: 1,
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
            hasError: true,
            errorMessage: 'error2',
            isUploading: false,
            originalIndex: 1,
            tempId: 1,
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

  describe('FILE_DOWLOADED', () => {
    it('should update the corresponding file', () => {
      const state = fromJS({
        currentStep: 'browse',
        filesToDownload: [],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalIndex: 1,
            fileURL: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 2,
          },
        ],
      });

      const action = {
        type: 'FILE_DOWNLOADED',
        fileTempId: 2,
        blob: 'test',
      };

      const expected = fromJS({
        currentStep: 'browse',
        filesToDownload: [],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: 'test',
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalIndex: 1,
            fileURL: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: false,
            tempId: 2,
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

  describe('INIT_FILE_TO_EDIT', () => {
    it('should set the fileToEdit object correctly', () => {
      const action = {
        type: 'INIT_FILE_TO_EDIT',
        fileToEdit: {
          test: 'test',
        },
      };
      const state = fromJS({
        fileToEdit: null,
        currentStep: 'test',
      });
      const expected = fromJS({
        fileToEdit: {
          test: 'test',
        },
        currentStep: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_ABORT_UPLOAD', () => {
    it('should set the isUploading key to false', () => {
      const action = {
        type: 'ON_ABORT_UPLOAD',
      };
      const state = fromJS({
        fileToEdit: {
          test: 'test',
          isUploading: true,
        },
        currentStep: 'test',
      });
      const expected = fromJS({
        fileToEdit: {
          test: 'test',
          isUploading: false,
        },
        currentStep: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the data correctly', () => {
      const action = {
        type: 'ON_CHANGE',
        keys: 'test',
        value: 'test 1',
      };
      const state = fromJS({
        fileToEdit: {
          test: 'test',
          isUploading: true,
        },
        currentStep: 'test',
      });
      const expected = fromJS({
        fileToEdit: {
          test: 'test 1',
          isUploading: true,
        },
        currentStep: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_URLS_TO_DOWNLOAD', () => {
    it('should change the data correctly', () => {
      const action = {
        type: 'ON_CHANGE_URLS_TO_DOWNLOAD',
        keys: 'test',
        value: ['test 1', 'test 2'],
      };
      const state = fromJS({
        filesToDownload: [],
        currentStep: 'test',
      });
      const expected = fromJS({
        filesToDownload: ['test 1', 'test 2'],
        currentStep: 'test',
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_EDIT_EXISTING_FILE', () => {
    it('should set the isUploading key to false', () => {
      const action = {
        type: 'ON_SUBMIT_EDIT_EXISTING_FILE',
      };
      const state = fromJS({
        fileToEdit: {
          test: 'test',
          isUploading: false,
        },
        currentStep: 'test',
      });
      const expected = fromJS({
        fileToEdit: {
          test: 'test',
          isUploading: true,
        },
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

  describe('RESET_FILE_TO_UPLOAD', () => {
    it('should set the fileToEdit key to null', () => {
      const action = {
        type: 'RESET_FILE_TO_EDIT',
      };
      const state = fromJS({
        fileToEdit: 'test',
      });
      const expected = fromJS({
        fileToEdit: null,
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
        filesToDownload: [],
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

  describe('SET_FILE_TO_DOWNLOAD_ERROR', () => {
    it('should update the specified file error', () => {
      const state = fromJS({
        currentStep: 'browse',
        filesToDownload: [],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            fileOriginalName: 'test1-test',
            originalName: 'test1',
            originalIndex: 1,
            fileURL: 'test1',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 2,
          },
        ],
      });

      const action = {
        type: 'SET_FILE_TO_DOWNLOAD_ERROR',
        fileTempId: 2,
      };

      const expected = fromJS({
        currentStep: 'browse',
        filesToDownload: [],
        filesToUpload: [
          {
            abortController: new AbortController(),
            file: { name: 'test1', ok: true },
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            hasError: false,
            errorMessage: null,
            isUploading: false,
            originalIndex: 0,
            tempId: null,
          },
          {
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'test1',
            },
            originalIndex: 1,
            originalName: 'test1',
            fileOriginalName: 'test1-test',
            fileURL: 'test1',
            hasError: true,
            errorMessage: 'test1-test',
            isUploading: false,
            isDownloading: false,
            tempId: 2,
          },
        ],
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

  describe('SET_FILE_TO_EDIT_ERROR', () => {
    it('should set the specified file error to fileToEdit', () => {
      const action = {
        type: 'SET_FILE_TO_EDIT_ERROR',
        errorMessage: 'Bad request',
      };
      const state = fromJS({
        fileToEdit: {
          originalIndex: 1,
          file: {
            name: 'test1',
          },
          hasError: false,
          errorMessage: null,
          isUploading: true,
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
      const expected = fromJS({
        fileToEdit: {
          originalIndex: 1,
          file: {
            name: 'test1',
          },
          hasError: true,
          errorMessage: 'Bad request',
          isUploading: false,
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
