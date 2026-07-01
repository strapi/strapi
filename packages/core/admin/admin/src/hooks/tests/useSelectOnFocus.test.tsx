/* eslint-disable check-file/filename-naming-convention */
import { type FocusEventHandler } from 'react';

import { render, screen, fireEvent } from '@testing-library/react';

import { useSelectOnFocus } from '../useSelectOnFocus';

const TestInput = ({ onFocus }: { onFocus?: FocusEventHandler<HTMLInputElement> }) => {
  const { onFocus: handleFocus } = useSelectOnFocus<HTMLInputElement>(onFocus);

  return <input aria-label="test-input" defaultValue="Hello World" onFocus={handleFocus} />;
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

  it('runs a caller-provided onFocus AND selects on keyboard focus', () => {
    const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');
    const externalOnFocus = jest.fn();

    render(<TestInput onFocus={externalOnFocus} />);
    const input = screen.getByLabelText('test-input');

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.focus(input);

    // Both behaviours run: the selection and the caller's handler.
    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(externalOnFocus).toHaveBeenCalledTimes(1);
  });

  it('still runs a caller-provided onFocus on pointer focus (without selecting)', () => {
    const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');
    const externalOnFocus = jest.fn();

    render(<TestInput onFocus={externalOnFocus} />);
    const input = screen.getByLabelText('test-input');

    fireEvent.pointerDown(window);
    fireEvent.focus(input);

    // No selection on click, but the caller's handler must still fire.
    expect(selectSpy).not.toHaveBeenCalled();
    expect(externalOnFocus).toHaveBeenCalledTimes(1);
  });
});
