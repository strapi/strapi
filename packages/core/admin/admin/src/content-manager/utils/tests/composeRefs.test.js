import { composeRefs } from '../composeRefs';

describe('composeRefs', () => {
  it('given the ref is a function it should call those functions with the node value', () => {
    const ref1 = jest.fn();
    const ref2 = jest.fn();
    const ref3 = jest.fn();
    const node = 'I am a node';

    const composedRefs = composeRefs(ref1, ref2, ref3);

    composedRefs(node);

    expect(ref1).toHaveBeenCalledWith(node);
    expect(ref2).toHaveBeenCalledWith(node);
    expect(ref3).toHaveBeenCalledWith(node);
  });

  /**
   * This is difficult because you need to be able to access the
   * ref.current value from outside the component.
   */
  it.todo('refs as React.useRef');
});
