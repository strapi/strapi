import { render } from '@tests/utils';
import { Route, RouteProps } from 'react-router-dom';

import { SearchURLQuery } from '../SearchURLQuery';

const trackUsage = jest.fn();
jest.mock('../../features/Tracking', () => ({
  useTracking: () => ({
    trackUsage,
  }),
}));

describe('<SearchURLQuery />', () => {
  it('should render an icon button by default', () => {
    const { getByRole } = render(<SearchURLQuery label="Search label" />);

    expect(getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('should toggle searchbar form and searchbar', async () => {
    const { user, getByRole } = render(<SearchURLQuery label="Search label" />);

    await user.click(getByRole('button', { name: 'Search' }));

    expect(getByRole('textbox', { name: 'Search label' })).toBeInTheDocument();
  });

  it('should push value to query params', async () => {
    let testLocation: RouteProps['location'] | null = null;

    const { user, getByRole } = render(<SearchURLQuery label="Search label" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <Route
                path="*"
                render={({ location }) => {
                  testLocation = location;

                  return null;
                }}
              />
            </>
          );
        },
      },
    });

    await user.click(getByRole('button', { name: 'Search' }));

    await user.type(getByRole('textbox', { name: 'Search label' }), 'michka');

    await user.keyboard('[Enter]');

    const searchParams = new URLSearchParams(testLocation?.['search']);

    expect(searchParams.has('_q')).toBe(true);
    expect(searchParams.get('_q')).toBe('michka');
  });

  it('should clear value and update query params', async () => {
    let testLocation: RouteProps['location'] | null = null;

    const { user, getByRole } = render(<SearchURLQuery label="Search label" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <Route
                path="*"
                render={({ location }) => {
                  testLocation = location;

                  return null;
                }}
              />
            </>
          );
        },
      },
    });

    await user.click(getByRole('button', { name: 'Search' }));

    await user.type(getByRole('textbox', { name: 'Search label' }), 'michka');

    await user.keyboard('[Enter]');

    expect(new URLSearchParams(testLocation?.['search']).has('_q')).toBe(true);

    await user.click(getByRole('button', { name: 'Clear' }));

    expect(getByRole('textbox', { name: 'Search label' })).toHaveValue('');

    expect(new URLSearchParams(testLocation?.['search']).has('_q')).toBe(false);
  });

  it('should call trackUsage with trackedEvent props when submit', async () => {
    const { getByRole, user } = render(
      <SearchURLQuery label="Search label" trackedEvent="didSearch" />
    );

    await user.click(getByRole('button', { name: 'Search' }));
    await user.type(getByRole('textbox', { name: 'Search label' }), 'michka');
    await user.keyboard('[Enter]');

    expect(trackUsage.mock.calls.length).toBe(1);
  });
});
