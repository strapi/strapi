import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider, useIntl } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import RelativeTime from '../index';

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
  ...jest.requireActual('react-intl'),
  useIntl: jest.fn(() => ({
    formatDate: jest.fn(() => '10/1/2015'),
    formatTime: jest.fn(() => '7:55 AM'),
    formatRelativeTime: jest.fn(() => '5 minutes ago'),
  })),
}));

describe('RelativeTime', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 08:00:00'));
  });

  afterAll(() => {
    jest.resetAllMocks();
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
    useIntl.mockReturnValueOnce({
      formatDate: jest.fn(() => '10/1/2015'),
      formatTime: jest.fn(() => '7:50 AM'),
      formatRelativeTime: jest.fn(() => 'in 5 minutes'),
    });
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 07:50:00'));

    render(App);

    expect(screen.getByText('in 5 minutes')).toBeInTheDocument();
  });

  it('can display the relative time for a past date', () => {
    useIntl.mockReturnValueOnce({
      formatDate: jest.fn(() => '10/1/2015'),
      formatTime: jest.fn(() => '8:00 AM'),
      formatRelativeTime: jest.fn(() => '5 minutes ago'),
    });
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 08:00:00'));

    render(App);

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
