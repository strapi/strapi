import { render, screen } from '@tests/utils';

import { RelativeTime } from '../RelativeTime';

const setDateNow = (now: number): jest.Spied<typeof Date.now> =>
  jest.spyOn(Date, 'now').mockReturnValue(now);

let spiedDateNow: ReturnType<typeof setDateNow> | undefined = undefined;

describe('RelativeTime', () => {
  afterAll(() => {
    if (spiedDateNow) {
      spiedDateNow.mockReset();
    }
  });

  it('renders and matches the snapshot', () => {
    spiedDateNow = setDateNow(1443686400000); // 2015-10-01 08:00:00
    render(<RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />);

    const timeElement = screen.getByRole('time');

    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveTextContent('5 minutes ago');
    expect(timeElement).toHaveAttribute('datetime', '2015-10-01T07:55:00.000Z');
    expect(timeElement).toHaveAttribute('title', '10/1/2015 7:55 AM');
  });

  it('can display the relative time for a future date', () => {
    spiedDateNow = setDateNow(1443685800000); // 2015-10-01 07:50:00
    render(<RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />);

    expect(screen.getByRole('time')).toHaveTextContent('in 5 minutes');
    // expect(getByText('in 5 minutes')).toBeInTheDocument();
  });

  it('can display the relative time for a past date', () => {
    spiedDateNow = setDateNow(1443686400000); // 2015-10-01 08:00:00
    render(<RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />);

    expect(screen.getByRole('time')).toHaveTextContent('5 minutes ago');
    // expect(getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('renders "now" when the timestamp is within the same second', () => {
    const now = 1443686400000; // 2015-10-01 08:00:00
    spiedDateNow = setDateNow(now);
    render(<RelativeTime timestamp={new Date(now)} />);

    expect(screen.getByRole('time')).toHaveTextContent('now');
  });

  it('counts days by calendar day rather than elapsed 24-hour periods', () => {
    // Thursday 2026-10-29 15:00 UTC; Saturday midnight is 33 hours away, two calendar days
    spiedDateNow = setDateNow(Date.parse('2026-10-29T15:00:00.000Z'));
    render(<RelativeTime timestamp={new Date('2026-10-31T00:00:00.000Z')} />);

    expect(screen.getByRole('time')).toHaveTextContent('in 2 days');
  });

  it('counts past days by calendar day rather than elapsed 24-hour periods', () => {
    spiedDateNow = setDateNow(Date.parse('2026-10-29T01:00:00.000Z'));
    render(<RelativeTime timestamp={new Date('2026-10-27T23:00:00.000Z')} />);

    expect(screen.getByRole('time')).toHaveTextContent('2 days ago');
  });

  // Regression for https://github.com/strapi/strapi/issues/27382
  it('does not throw when the timestamp is an invalid Date', () => {
    render(<RelativeTime timestamp={new Date('')} />);

    expect(screen.getByRole('time')).toHaveTextContent('-');
  });
});
