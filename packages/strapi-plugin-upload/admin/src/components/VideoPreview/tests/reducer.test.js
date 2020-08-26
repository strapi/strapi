import reducer, { initialState } from '../reducer';

describe('Upload | components | VideoPreview | reducer', () => {
  it('should update duration and set dataLoaded to true', () => {
    const state = initialState;

    const action = {
      type: 'DATA_LOADED',
      duration: 2000,
    };

    const expectedState = state.set('dataLoaded', true).set('duration', 2000);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should set metadataLoaded to true', () => {
    const state = initialState;

    const action = {
      type: 'METADATA_LOADED',
    };

    const expectedState = state.set('metadataLoaded', true);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should set seeked to true', () => {
    const state = initialState;

    const action = {
      type: 'SEEKED',
    };

    const expectedState = state.set('seeked', true);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should set isHover to true if passed value is true', () => {
    const state = initialState;

    const action = {
      type: 'SET_IS_HOVER',
      isHover: true,
    };

    const expectedState = state.set('isHover', true);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should set isHover to false if passed value is false', () => {
    const state = initialState.set('isHover', true);

    const action = {
      type: 'SET_IS_HOVER',
      isHover: false,
    };

    const expectedState = state.set('isHover', false);

    expect(reducer(state, action)).toEqual(expectedState);
  });

  it('should update snapshot', () => {
    const state = initialState;

    const snapshot =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAANQCAYAAADwgbzJAAAgAElEQVR4Xuy9aaytaXYetPY8nfnO99Z0q6va7e622+2y27ZCiEFEJkDjeIhp2zG22+3EwcEGIwhI/AiREAIRCRQsCBJCIkKBH0kQNj9sImhCJMuNbCltu6fq6qq+VXc';

    const action = {
      type: 'SET_SNAPSHOT',
      snapshot,
    };

    const expectedState = state.set('snapshot', snapshot);

    expect(reducer(state, action)).toEqual(expectedState);
  });
});
