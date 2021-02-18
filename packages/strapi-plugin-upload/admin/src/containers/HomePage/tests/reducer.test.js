import { fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('Upload | containers | HomePage | reducer', () => {
  describe('GET_DATA', () => {
    it('should set isLoading to true', () => {
      const state = fromJS({
        isLoading: false,
        test: true,
      });
      const action = {
        type: 'GET_DATA',
      };

      const expected = fromJS({
        isLoading: true,
        test: true,
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_ERROR', () => {
    it('should set isLoading to false', () => {
      const state = fromJS({
        isLoading: true,
        test: true,
      });
      const action = {
        type: 'GET_DATA_ERROR',
      };

      const expected = fromJS({
        isLoading: false,
        test: true,
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should update data with received data', () => {
      const state = initialState;

      const receivedData = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);

      const receivedDataCount = 2;

      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: receivedData,
        count: receivedDataCount,
      };

      const expectedState = state
        .set('data', receivedData)
        .set('dataCount', receivedDataCount)
        .set('isLoading', false);

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('ON_CHANGE_DATA_TO_DELETE', () => {
    it('should add a media to dataToDelete if value is true', () => {
      const data = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);

      const state = initialState.set('data', data);

      const action = {
        type: 'ON_CHANGE_DATA_TO_DELETE',
        id: 2,
      };

      const expectedState = state.set(
        'dataToDelete',
        fromJS([
          {
            id: 2,
            name: 'photo_2020-02-27 17.07.08.jpeg',
            ext: '.jpeg',
            mime: 'image/jpeg',
            size: 140.64,
            url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
            created_at: '2020-03-04T14:16:35.148Z',
            updated_at: '2020-03-04T14:16:35.148Z',
          },
        ])
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should remove a media to dataToDelete if value is false', () => {
      const data = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);
      const dataToDelete = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);

      const state = initialState.set('data', data).set('dataToDelete', dataToDelete);

      const action = {
        type: 'ON_CHANGE_DATA_TO_DELETE',
        id: 2,
      };

      const expectedState = state.set(
        'dataToDelete',
        fromJS([
          {
            id: 1,
            name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
            ext: '.png',
            mime: 'image/png',
            size: 146.25,
            url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
            created_at: '2020-03-04T09:45:32.444Z',
            updated_at: '2020-03-04T09:45:32.444Z',
          },
        ])
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });

  describe('TOGGLE_SELECT_ALL', () => {
    it('should empty dataToDelete if all items are selected', () => {
      const data = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);
      const dataToDelete = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);

      const state = initialState.set('data', data).set('dataToDelete', dataToDelete);

      const action = {
        type: 'TOGGLE_SELECT_ALL',
      };

      const expectedState = state.set('dataToDelete', fromJS([]));

      expect(reducer(state, action)).toEqual(expectedState);
    });

    it('should fill dataToDelete if all items are not selected', () => {
      const data = fromJS([
        {
          id: 1,
          name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
          ext: '.png',
          mime: 'image/png',
          size: 146.25,
          url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
          created_at: '2020-03-04T09:45:32.444Z',
          updated_at: '2020-03-04T09:45:32.444Z',
        },
        {
          id: 2,
          name: 'photo_2020-02-27 17.07.08.jpeg',
          ext: '.jpeg',
          mime: 'image/jpeg',
          size: 140.64,
          url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
          created_at: '2020-03-04T14:16:35.148Z',
          updated_at: '2020-03-04T14:16:35.148Z',
        },
      ]);
      const dataToDelete = fromJS([]);

      const state = initialState.set('data', data).set('dataToDelete', dataToDelete);

      const action = {
        type: 'TOGGLE_SELECT_ALL',
      };

      const expectedState = state.set(
        'dataToDelete',
        fromJS([
          {
            id: 1,
            name: 'Capture d’écran 2020-02-25 à 15.43.44.png',
            ext: '.png',
            mime: 'image/png',
            size: 146.25,
            url: '/uploads/ba0c3352c4b14132aed3fcf3110b481c.png',
            created_at: '2020-03-04T09:45:32.444Z',
            updated_at: '2020-03-04T09:45:32.444Z',
          },
          {
            id: 2,
            name: 'photo_2020-02-27 17.07.08.jpeg',
            ext: '.jpeg',
            mime: 'image/jpeg',
            size: 140.64,
            url: '/uploads/1d2ac677ea194b48bbe55ecec1b452d6.jpeg',
            created_at: '2020-03-04T14:16:35.148Z',
            updated_at: '2020-03-04T14:16:35.148Z',
          },
        ])
      );

      expect(reducer(state, action)).toEqual(expectedState);
    });
  });
});
