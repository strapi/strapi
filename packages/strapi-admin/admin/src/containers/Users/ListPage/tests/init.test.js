import init from '../init';

describe('ADMIN | CONTAINERS | USERS | ListPage | init', () => {
  it('should return the initialState', () => {
    const initialState = {
      test: true,
    };

    expect(init(initialState)).toEqual(initialState);
  });
});
