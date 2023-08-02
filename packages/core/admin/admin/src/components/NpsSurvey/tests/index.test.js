import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import NpsSurvey from '..';

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
const originalLocalStorage = global.localStorage;

const user = userEvent.setup({ delay: null });

const setup = () =>
  render(<NpsSurvey />, {
    wrapper({ children }) {
      return (
        <IntlProvider locale="en" defaultLocale="en">
          <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
        </IntlProvider>
      );
    },
  });

describe('NPS survey', () => {
  beforeAll(() => {
    global.localStorage = localStorageMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('renders survey if enabled', () => {
    localStorageMock.getItem.mockReturnValueOnce({ enabled: true });
    setup();
    act(() => jest.runAllTimers());
    expect(screen.getByLabelText('0')).toBeInTheDocument();
    expect(screen.getByLabelText('10')).toBeInTheDocument();
    expect(screen.getByText(/not at all likely/i)).toBeInTheDocument();
    expect(screen.getByText(/extremely likely/i)).toBeInTheDocument();
  });

  it('does not render survey if disabled', () => {
    localStorageMock.getItem.mockReturnValueOnce({ enabled: false });
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();
  });

  it('saves user response', async () => {
    localStorageMock.getItem.mockReturnValueOnce({ enabled: true });
    setup();
    act(() => jest.runAllTimers());

    fireEvent.click(screen.getByRole('radio', { name: '10' }));
    expect(screen.getByRole('button', { name: /submit feedback/i }));

    act(() => {
      fireEvent.submit(screen.getByRole('form'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/thank you very much for your feedback!/i)).toBeInTheDocument();
    });

    const storedData = JSON.parse(localStorageMock.setItem.mock.calls.at(-1).at(1));
    expect(storedData).toEqual({
      enabled: true,
      lastResponseDate: expect.any(String),
      firstDismissalDate: null,
      lastDismissalDate: null,
    });
    expect(new Date(storedData.lastResponseDate)).toBeInstanceOf(Date);
  });

  it('saves first user dismissal', async () => {
    localStorageMock.getItem.mockReturnValueOnce({ enabled: true });
    setup();
    act(() => jest.runAllTimers());

    await user.click(screen.getByText(/dismiss survey/i));
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    const storedData = JSON.parse(localStorageMock.setItem.mock.calls.at(-1).at(1));
    expect(storedData).toEqual({
      enabled: true,
      lastResponseDate: null,
      firstDismissalDate: expect.any(String),
    });
    expect(new Date(storedData.firstDismissalDate)).toBeInstanceOf(Date);
  });

  it('saves subsequent user dismissal', async () => {
    const firstDismissalDate = '2000-07-20T09:28:51.963Z';
    localStorageMock.getItem.mockReturnValueOnce({
      enabled: true,
      firstDismissalDate,
    });
    setup();
    act(() => jest.runAllTimers());
    await user.click(screen.getByText(/dismiss survey/i));
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    const storedData = JSON.parse(localStorageMock.setItem.mock.calls.at(-1).at(1));
    expect(storedData).toEqual({
      enabled: true,
      lastResponseDate: null,
      firstDismissalDate,
      lastDismissalDate: expect.any(String),
    });
    expect(new Date(storedData.lastDismissalDate)).toBeInstanceOf(Date);
  });

  it('respects the delay after user submission', async () => {
    const initialDate = new Date('2020-01-01');
    const withinDelay = new Date('2020-01-31');
    const beyondDelay = new Date('2020-03-31');

    localStorageMock.getItem.mockReturnValue({ enabled: true, lastResponseDate: initialDate });

    jest.setSystemTime(initialDate);

    // Survey should not show up right after submission
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should not show up during delay
    jest.advanceTimersByTime(withinDelay - initialDate);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should show up again after delay
    jest.advanceTimersByTime(beyondDelay - withinDelay);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.getByText(/not at all likely/i)).toBeInTheDocument();
  });

  it('respects the delay after first user dismissal', async () => {
    const initialDate = new Date('2020-01-01');
    const withinDelay = new Date('2020-01-04');
    const beyondDelay = new Date('2020-01-08');

    localStorageMock.getItem.mockReturnValue({
      enabled: true,
      firstDismissalDate: initialDate,
      lastDismissalDate: null,
      lastResponseDate: null,
    });

    jest.setSystemTime(initialDate);

    // Survey should not show up right after dismissal
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should not show up during delay
    jest.advanceTimersByTime(withinDelay - initialDate);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should show up again after delay
    jest.advanceTimersByTime(beyondDelay - withinDelay);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.getByText(/not at all likely/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('respects the delay after subsequent user dismissal', async () => {
    const initialDate = new Date('2020-01-01');
    const withinDelay = new Date('2020-03-30');
    const beyondDelay = new Date('2020-04-01');

    localStorageMock.getItem.mockReturnValue({
      enabled: true,
      firstDismissalDate: initialDate,
      lastDismissalDate: initialDate,
      lastResponseDate: null,
    });

    jest.setSystemTime(initialDate);

    // Survey should not show up right after dismissal
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should not show up during delay
    jest.advanceTimersByTime(withinDelay - initialDate);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.queryByText(/not at all likely/i)).not.toBeInTheDocument();

    // Survey should show up again after delay
    jest.advanceTimersByTime(beyondDelay - withinDelay);
    setup();
    act(() => jest.runAllTimers());
    expect(screen.getByText(/not at all likely/i)).toBeInTheDocument();
  });

  afterAll(() => {
    global.localStorage = originalLocalStorage;
  });
});
