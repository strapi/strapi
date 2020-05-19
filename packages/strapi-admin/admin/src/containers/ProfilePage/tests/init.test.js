import init from '../init';

describe('ADMIN | CONTAINERS | ProfilePage | init', () => {
  it('should return the initialState', () => {
    const initialState = {
      test: true,
    };

    expect(init(initialState)).toEqual(initialState);
  });
});
