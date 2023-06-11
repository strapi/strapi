import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingProvider } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { Settings } from '../Settings';
import { pageSizes, sortOptions } from '../../../../../constants';

const testPageSize = pageSizes[0];
const testSort = sortOptions[0].value;

const render = ({ pageSize = testPageSize, sort = testSort, onChange = jest.fn() } = {}) => ({
  user: userEvent.setup(),
  ...renderRTL(<Settings sort={sort} pageSize={pageSize} onChange={onChange} />, {
    wrapper: ({ children }) => (
      <IntlProvider locale="en" messages={{}}>
        <TrackingProvider>
          <ThemeProvider theme={lightTheme}>
            <MemoryRouter>{children}</MemoryRouter>
          </ThemeProvider>
        </TrackingProvider>
      </IntlProvider>
    ),
  }),
});

describe('Upload - Configure | Settings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial render', () => {
    it('renders and matches the snapshot', async () => {
      const { getByText, container } = render();

      expect(getByText('Entries per page')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });
  });

  describe('pageSize', () => {
    it('renders all page Sizes', async () => {
      const { getByRole, user } = render();

      await user.click(getByRole('combobox', { name: 'Entries per page' }));

      pageSizes.forEach((size) => {
        expect(getByRole('option', { name: size })).toBeInTheDocument();
      });
    });

    it('call onChange when changing page size', async () => {
      const onChange = jest.fn();
      const { user, getByRole } = render({ onChange });

      const testValue = pageSizes[1];

      await user.click(getByRole('combobox', { name: 'Entries per page' }));

      await user.click(getByRole('option', { name: testValue }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ target: { name: 'pageSize', value: testValue } });
    });
  });

  describe('sort', () => {
    it('renders all sort options', async () => {
      const { user, getByRole } = render();

      await user.click(getByRole('combobox', { name: 'Default sort order' }));

      sortOptions.forEach((filter) => {
        expect(getByRole('option', { name: filter.value })).toBeInTheDocument();
      });
    });

    it('call onChange when changing sort', async () => {
      const onChange = jest.fn();
      const { user, getByRole } = render({ onChange });

      const testValue = sortOptions[1].value;

      await user.click(getByRole('combobox', { name: 'Default sort order' }));

      await user.click(getByRole('option', { name: testValue }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ target: { name: 'sort', value: testValue } });
    });
  });
});
