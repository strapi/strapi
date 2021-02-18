import createNewFilesToUploadArray from '../createNewFilesToUploadArray';

describe('UPLOAD | containers | ModalStepper | utils', () => {
  describe('createNewFilesToUploadArray', () => {
    it('should create an array containing the data', () => {
      const data = {
        test: { name: 'test', ok: true },
      };
      const expected = [
        {
          abortController: new AbortController(),
          file: { name: 'test', ok: true },
          fileInfo: {
            alternativeText: '',
            caption: '',
            name: 'test',
          },
          tempId: null,
          originalName: 'test',
          hasError: false,
          errorMessage: null,
          isUploading: false,
        },
      ];

      expect(createNewFilesToUploadArray(data)).toEqual(expected);
    });

    it('should return an empty array if an empty object is passed', () => {
      expect(createNewFilesToUploadArray({})).toEqual([]);
    });
  });
});
