/* eslint-disable check-file/filename-naming-convention */
import { render, screen, fireEvent } from '@testing-library/react';

import { useSelectOnFocus } from '../useSelectOnFocus';

const TestInput = () => {
  const { onFocus } = useSelectOnFocus();

  return <input aria-label="test-input" defaultValue="Hello World" onFocus={onFocus} />;
};

describe('useSelectOnFocus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('selects the field content when focus follows a keyboard (Tab) interaction', () => {
    const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');

    render(<TestInput />);
    const input = screen.getByLabelText('test-input');

    // Simulate keyboard navigation, then the resulting focus.
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.focus(input);

    expect(selectSpy).toHaveBeenCalledTimes(1);
  });

  it('does not select the field content when focus follows a pointer (click) interaction', () => {
    const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');

    render(<TestInput />);
    const input = screen.getByLabelText('test-input');

    // Simulate a mouse/touch interaction, then the resulting focus.
    fireEvent.pointerDown(window);
    fireEvent.focus(input);

    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('selects again when the user switches back to the keyboard', () => {
    const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');

    render(<TestInput />);
    const input = screen.getByLabelText('test-input');

    // Pointer first (would not select)...
    fireEvent.pointerDown(window);
    fireEvent.focus(input);
    expect(selectSpy).not.toHaveBeenCalled();

    // ...then keyboard again (should select).
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.focus(input);
    expect(selectSpy).toHaveBeenCalledTimes(1);
  });
});
