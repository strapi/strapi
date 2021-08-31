import init from '../init';

describe('ADMIN | CONTAINERS | AUTH | init', () => {
  it('should return the initialState', () => {
    const initialState = {
      test: true,
    };

    expect(init(initialState)).toEqual(initialState);
  });
});
