import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

import { RelativeTime, RelativeTimeProps } from '../RelativeTime';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2015-10-01 08:00:00') as unknown as number);
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  const render = (props?: Partial<RelativeTimeProps>) => ({
    ...renderRTL(<RelativeTime timestamp={new Date('2015-10-01 07:55:00')} {...props} />, {
      wrapper: ({ children }: { children: React.JSX.Element }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} textComponent="span">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }),
    user: userEvent.setup(),
  });

  it('renders and matches the snapshot', () => {
    const {
      container: { firstChild },
    } = render();

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
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2015-10-01 07:50:00') as unknown as number);

    render();

    expect(screen.getByText('in 5 minutes')).toBeInTheDocument();
  });

  it('can display the relative time for a past date', () => {
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2015-10-01 08:00:00') as unknown as number);

    render();

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });
});
