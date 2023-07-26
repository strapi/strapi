/**
 *
 * Tests for PageSizeURLQuery
 *
 */

import React from 'react';

import { render } from '@tests/utils';
import { Route } from 'react-router-dom';

import { PageSizeURLQuery } from '../PageSizeURLQuery';

const trackUsage = jest.fn();
jest.mock('../../features/Tracking', () => ({
  useTracking: () => ({
    trackUsage,
  }),
}));

describe('PageSizeURLQuery', () => {
  it('renders', async () => {
    const { getByRole, getAllByRole, getByText, user } = render(<PageSizeURLQuery />);

    expect(getByRole('combobox')).toHaveTextContent('10');
    expect(getByText('Entries per page')).toBeInTheDocument();

    await user.click(getByRole('combobox'));

    expect(getAllByRole('option')).toHaveLength(4);
  });

  it('should display the default pageSize correctly if passed as a prop', () => {
    const { getByRole } = render(<PageSizeURLQuery defaultValue="20" />);

    expect(getByRole('combobox')).toHaveTextContent('20');
  });

  it('should display the pageSize correctly if its in the url query', () => {
    const { getByRole } = render(<PageSizeURLQuery />, {
      initialEntries: [{ search: 'pageSize=50' }],
    });

    expect(getByRole('combobox')).toHaveTextContent('50');
  });

  it('should render a custom list of options if provided', async () => {
    const options = ['5', '10', '15'];

    const { getByRole, user } = render(<PageSizeURLQuery options={options} />);

    expect(getByRole('combobox')).toHaveTextContent('10');

    await user.click(getByRole('combobox'));

    options.forEach((option) => {
      expect(getByRole('option', { name: option })).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should change the value when the user selects a new value', async () => {
      let testLocation = null;

      const { getByRole, user } = render(<PageSizeURLQuery />, {
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

      await user.click(getByRole('combobox'));

      await user.click(getByRole('option', { name: '20' }));

      expect(getByRole('combobox')).toHaveTextContent('20');

      const searchParams = new URLSearchParams(testLocation.search);

      expect(searchParams.has('pageSize')).toBe(true);
      expect(searchParams.get('pageSize')).toBe('20');
    });

    it('should use the default value and then change the value when the user selects a new value', async () => {
      const { getByRole, user } = render(<PageSizeURLQuery defaultValue="20" />);

      expect(getByRole('combobox')).toHaveTextContent('20');

      await user.click(getByRole('combobox'));

      await user.click(getByRole('option', { name: '50' }));

      expect(getByRole('combobox')).toHaveTextContent('50');
    });

    it('should call trackUsage with trackedEvent props when submit', async () => {
      const { getByRole, user } = render(<PageSizeURLQuery trackedEvent="test" />);

      await user.click(getByRole('combobox'));

      await user.click(getByRole('option', { name: '50' }));

      expect(trackUsage.mock.calls.length).toBe(1);
    });
  });
});
