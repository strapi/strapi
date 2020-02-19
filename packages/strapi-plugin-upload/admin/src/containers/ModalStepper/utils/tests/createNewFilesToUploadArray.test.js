import createNewFilesToUploadArray from '../createNewFilesToUploadArray';

describe('UPLOAD | containers | ModalStepper | utils', () => {
  describe('createNewFilesToUploadArray', () => {
    it('should create an array containing the data', () => {
      const data = {
        test: { ok: true },
      };
      const expected = [
        {
          file: { ok: true },
          abortController: new AbortController(),
          isUploading: false,
          originalIndex: 0,
        },
      ];

      expect(createNewFilesToUploadArray(data)).toEqual(expected);
    });

    it('should return an empty array if an empty object is passed', () => {
      expect(createNewFilesToUploadArray({})).toEqual([]);
    });
  });
});
