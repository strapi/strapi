/* eslint-disable check-file/filename-naming-convention */

import { lightTheme, ThemeProvider, Main } from '@strapi/design-system';
import { render, renderHook, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useFocusWhenNavigate } from '../useFocusWhenNavigate';

const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

const setup = () => {
  return render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <Main />
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('useFocusWhenNavigate', () => {
  it('focus element with default selector', async () => {
    setup();

    renderHook(() => useFocusWhenNavigate());

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('check console.warn output', () => {
    const testeSelector = 'error';

    setup();

    renderHook(() => useFocusWhenNavigate({ selector: testeSelector }));

    const warnMessage = `[useFocusWhenNavigate] The page does not contain the selector "${testeSelector}" and can't be focused.`;

    expect(consoleWarnMock).toBeCalledWith(warnMessage);
  });
});
