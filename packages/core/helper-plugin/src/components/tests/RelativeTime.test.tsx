// TODO: Needs to be reworked with proper typescript implementation. Current typescript port works but should only be used as a temporary patch
import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider, useIntl } from 'react-intl';

import { RelativeTime } from '../RelativeTime';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />
    </IntlProvider>
  </ThemeProvider>
);

// TO BE REMOVED: we have added this mock to prevent errors in the snapshots caused by the Unicode space character
// before AM/PM in the dates, after the introduction of node 18.13
jest.mock('react-intl', () => ({
  ...jest.requireActual('react-intl') as any,
  useIntl: jest.fn(() => ({
    formatDate: jest.fn(() => '10/1/2015'),
    formatTime: jest.fn(() => '7:55 AM'),
    formatRelativeTime: jest.fn(() => '5 minutes ago'),
  })),
}));

const mockedUseIntl = useIntl as jest.Mocked<any>;

describe('RelativeTime', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 08:00:00') as unknown as number);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render(App);

    expect(firstChild).toMatchInlineSnapshot(`
      <time
        datetime="2015-10-01T07:55:00.000Z"
        title="10/1/2015 7:55 AM"
      >
        5 minutes ago
      </time>
    `);
  });

  it('can display the relative time for a future date', () => {
    mockedUseIntl.mockReturnValueOnce({
      formatDate: jest.fn(() => '10/1/2015'),
      formatTime: jest.fn(() => '7:50 AM'),
      formatRelativeTime: jest.fn(() => 'in 5 minutes'),
    });
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 07:50:00') as unknown as number);

    render(App);

    expect(screen.getByText('in 5 minutes')).toBeInTheDocument();
  });

  it('can display the relative time for a past date', () => {
    mockedUseIntl.mockReturnValueOnce({
      formatDate: jest.fn(() => '10/1/2015'),
      formatTime: jest.fn(() => '8:00 AM'),
      formatRelativeTime: jest.fn(() => '5 minutes ago'),
    });
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 08:00:00') as unknown as number);

    render(App);

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
