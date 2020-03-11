import { List, fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('Upload | containers | HomePage | reducer', () => {
  it('should update data with received data', () => {
    const state = initialState;

    const receivedData = [
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
    ];

    const action = {
      type: 'GET_DATA_SUCCEEDED',
      data: receivedData,
    };

    const expectedState = state.set('data', receivedData);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should add a media to dataToDelete if value is true', () => {
    const state = initialState;

    const action = {
      type: 'ON_CHANGE_DATA_TO_DELETE',
      value: true,
      id: 2,
    };

    const expectedState = state.set('dataToDelete', fromJS([2]));

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should remove a media to dataToDelete if value is false', () => {
    const data = [
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
    ];
    const state = initialState.set('data', data).set('dataToDelete', List([1, 2]));

    const action = {
      type: 'ON_CHANGE_DATA_TO_DELETE',
      id: 2,
    };

    const expectedState = state.set('dataToDelete', List([1]));

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should empty dataToDelete if all items are selected', () => {
    const data = [
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
    ];
    const state = initialState.set('data', data).set('dataToDelete', List([1, 2]));

    const action = {
      type: 'TOGGLE_SELECT_ALL',
    };

    const expectedState = state.set('dataToDelete', List([]));

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should fill dataToDelete if all items are not selected', () => {
    const data = [
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
    ];
    const state = initialState.set('data', data).set('dataToDelete', List([1]));

    const action = {
      type: 'TOGGLE_SELECT_ALL',
    };

    const expectedState = state.set('dataToDelete', List([1, 2]));

    expect(reducer(state, action)).toEqual(expectedState);
  });
});
