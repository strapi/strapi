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

    expect(screen.getByRole('time')).toMatchInlineSnapshot(`
      <time
        datetime="2015-10-01T07:55:00.000Z"
        role="time"
        title="10/1/2015 7:55 AM"
      >
        5 minutes ago
      </time>
    `);
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
});
