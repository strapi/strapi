/* eslint-disable check-file/filename-naming-convention */

import { Main } from '@strapi/design-system';
import { render, renderHook } from '@tests/utils';

import { useFocusWhenNavigate } from '../useFocusWhenNavigate';

const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

describe('useFocusWhenNavigate', () => {
  it('focus element with default selector', async () => {
    const { getByRole } = render(<Main labelledBy="" />);

    renderHook(() => useFocusWhenNavigate());

    expect(getByRole('main')).toHaveFocus();
  });

  it('check console.warn output', () => {
    const testeSelector = 'error';

    render(<Main labelledBy="" />);

    renderHook(() => useFocusWhenNavigate({ selector: testeSelector }));

    const warnMessage = `[useFocusWhenNavigate] The page does not contain the selector "${testeSelector}" and can't be focused.`;

    expect(consoleWarnMock).toBeCalledWith(warnMessage);
  });
});
