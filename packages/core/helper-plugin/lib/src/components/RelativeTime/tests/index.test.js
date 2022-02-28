import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import RelativeTime from '../index';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />
    </IntlProvider>
  </ThemeProvider>
);

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
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 07:50:00'));

    render(App);

    expect(screen.getByText('in 5 minutes')).toBeInTheDocument();
  });

  it('can display the relative time for a past date', () => {
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01 08:00:00'));

    render(App);

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
