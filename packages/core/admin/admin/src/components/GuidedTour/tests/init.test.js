import { cloneDeep } from 'lodash';
import init from '../init';
import { initialState } from '../reducer';

class LocalStorage {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorage();

describe('GuidedTour init', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should load initialState', () => {
    const loadedState = init(cloneDeep(initialState));
    expect(loadedState).toEqual(initialState);
  });

  it('should set CTB.create, CTB.success steps to true', () => {
    localStorage.setItem(
      'GUIDED_TOUR_COMPLETED_STEPS',
      JSON.stringify(['contentTypeBuilder.create', 'contentTypeBuilder.success'])
    );

    const expectedState = cloneDeep(initialState);
    expectedState.guidedTourState.contentTypeBuilder.create = true;
    expectedState.guidedTourState.contentTypeBuilder.success = true;

    const loadedState = init(cloneDeep(initialState));
    expect(loadedState).toEqual(expectedState);
  });

  it('should set state for currentStep to done and set currentStep itself to null', () => {
    localStorage.setItem('GUIDED_TOUR_CURRENT_STEP', JSON.stringify('contentTypeBuilder.create'));

    const expectedState = cloneDeep(initialState);
    expectedState.guidedTourState.contentTypeBuilder.create = true;

    const loadedState = init(cloneDeep(initialState));
    expect(loadedState).toEqual(expectedState);
    expect(JSON.parse(localStorage.getItem('GUIDED_TOUR_CURRENT_STEP'))).toEqual(null);
  });

  it('should load isSkipped into state', () => {
    localStorage.setItem('GUIDED_TOUR_SKIPPED', JSON.stringify(true));

    const expectedState = cloneDeep(initialState);
    expectedState.isSkipped = true;

    const loadedState = init(cloneDeep(initialState));
    expect(loadedState).toEqual(expectedState);
  });
});
