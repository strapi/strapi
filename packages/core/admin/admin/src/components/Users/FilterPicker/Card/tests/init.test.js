import init from '../init';

describe('ADMIN | COMPONENTS | USERS | FilterPicker | Card | init', () => {
  it('should return the initialState', () => {
    const initialState = {
      test: true,
    };

    expect(init(initialState)).toEqual(initialState);
  });
});
