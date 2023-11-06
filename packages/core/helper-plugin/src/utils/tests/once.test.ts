import { once, PREFIX } from '../once';

describe('HELPER_PLUGIN | utils | once', () => {
  it('should call the wrapped function only once', () => {
    const mockFn = jest.fn();
    const wrappedFn = once(mockFn);

    wrappedFn();
    wrappedFn();
    wrappedFn();

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the wrapped function', () => {
    const mockFn = jest.fn();
    const wrappedFn = once(mockFn);

    wrappedFn(1, 'hello');

    expect(mockFn).toHaveBeenCalledWith(1, 'hello');
  });

  it('should throw TypeError if not given a function', () => {
    expect(() => {
      once('not a function' as any);
    }).toThrowError(new TypeError(`${PREFIX} once requires a function parameter`));
  });
});
