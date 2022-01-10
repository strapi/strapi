import { handleGuidedTourVisibility } from '../handleGuidedTourVisibility';

describe('Guided Tour | utils | handleGuidedTourVisibility', () => {
  it('should call the callback function', () => {
    const roles = [{ name: 'Super Admin' }];
    const callbackFn = jest.fn();

    handleGuidedTourVisibility(roles, callbackFn);

    expect(callbackFn).toBeCalled();
  });

  it('should call the callback with true as an argument', () => {
    const roles = [{ name: 'Super Admin' }];

    handleGuidedTourVisibility(roles, value => expect(value).toBe(true));
  });

  it('should call the callback with false as an argument', () => {
    const roles = [{ name: 'Editor' }];

    handleGuidedTourVisibility(roles, value => expect(value).toBe(false));
  });
});
