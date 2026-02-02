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

  it('renders with correct attributes and formatting for past dates', () => {
    spiedDateNow = setDateNow(1443686400000); // 2015-10-01 08:00:00
    render(<RelativeTime timestamp={new Date('2015-10-01 07:55:00')} />);

    const timeElement = screen.getByRole('time');
    expect(timeElement).toHaveAttribute('datetime', '2015-10-01T07:55:00.000Z');
    expect(timeElement).toHaveAttribute('title', '10/1/2015 7:55 AM');
    expect(timeElement).toHaveTextContent('5 minutes ago');
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

  it('handles when timestamp is exactly now', () => {
    const now = new Date('2015-10-01 08:00:00').getTime();
    spiedDateNow = setDateNow(now);

    render(<RelativeTime timestamp={new Date(now)} />);

    expect(screen.getByRole('time')).toHaveTextContent('now');
  });
});
