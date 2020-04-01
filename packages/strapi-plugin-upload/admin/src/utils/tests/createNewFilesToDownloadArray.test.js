import createNewFilesToDownloadArray, {
  getMax,
  getTempsIds,
} from '../createNewFilesToDownloadArray';

describe('UPLOAD | utils', () => {
  describe('createNewFilesToDownloadArray', () => {
    it('should create an array containing the formatted data and filter the empty data', () => {
      const dataURLArray = ['', 'un', undefined, 'deux', null, 'trois'];
      const dataFilesArray = [
        {
          abortController: new AbortController(),
          file: { name: 'test', ok: true },
          fileInfo: {
            alternativeText: '',
            caption: '',
            name: 'test',
          },
          tempId: null,
          hasError: false,
          errorMessage: null,
          isUploading: false,
        },
        {
          abortController: new AbortController(),
          file: { name: 'test', ok: true },
          fileInfo: {
            alternativeText: '',
            caption: '',
            name: 'test',
          },
          tempId: 121,
          hasError: false,
          errorMessage: null,
          isUploading: false,
        },
      ];

      const received = createNewFilesToDownloadArray(dataURLArray, dataFilesArray);

      expect(received).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'un',
            },
            fileURL: 'un',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 123,
          }),
          expect.objectContaining({
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'deux',
            },
            fileURL: 'deux',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 125,
          }),
          expect.objectContaining({
            file: null,
            fileInfo: {
              alternativeText: '',
              caption: '',
              name: 'trois',
            },
            fileURL: 'trois',
            hasError: false,
            errorMessage: null,
            isUploading: false,
            isDownloading: true,
            tempId: 127,
          }),
        ])
      );
    });
  });

  describe('getMax', () => {
    it('should return the max of an array + 1', () => {
      const data = [0, 12, 1, 121];

      const expected = 122;

      expect(getMax(data)).toEqual(expected);
    });
  });

  describe('getTempsIds', () => {
    it('should add 0 to the initial array', () => {
      const data = [];

      const expected = [0];

      expect(getTempsIds(data)).toEqual(expected);
    });

    it('should return a unique array of ids and remove the undefined and null values', () => {
      const data = [
        {
          tempId: null,
        },
        {
          tempId: 'a',
        },
        {
          tempId: 0,
        },
        {},
        {
          tempId: 1,
        },
      ];

      const expected = [0, 'a', 1];

      expect(getTempsIds(data)).toEqual(expected);
    });
  });
});
