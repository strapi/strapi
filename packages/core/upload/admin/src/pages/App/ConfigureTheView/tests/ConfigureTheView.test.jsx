import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import ConfigureTheView from '..';
import { pageSizes, sortOptions } from '../../../../constants';

const mutateAsync = jest.fn();
jest.mock('../../../../hooks/useConfig', () => ({
  useConfig: jest.fn(() => ({
    mutateConfig: {
      mutateAsync,
    },
  })),
}));

const render = (
  config = {
    pageSize: pageSizes[0],
    sort: sortOptions[0].value,
  }
) => ({
  user: userEvent.setup(),
  ...renderRTL(<ConfigureTheView config={config} />, {
    wrapper: ({ children }) => (
      <IntlProvider locale="en" messages={{}}>
        <DesignSystemProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </DesignSystemProvider>
      </IntlProvider>
    ),
  }),
});

describe('Upload - Configure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders and matches the snapshot', () => {
      const { container, getByText } = render();

      expect(getByText('Configure the view - Media Library')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });
  });

  describe('save', () => {
    it('save renders and is initially disabled', () => {
      const { getByText, getByRole } = render();

      expect(getByText('Configure the view - Media Library')).toBeInTheDocument();
      expect(
        getByRole('button', {
          name: 'Save',
        })
      ).toHaveAttribute('disabled');
    });
  });

  describe('user actions', () => {
    const testPageSize = pageSizes[1];

    it('modify settings', async () => {
      const { user, getByRole, getByText } = render();

      expect(getByRole('combobox', { name: 'Entries per page' })).toHaveTextContent('10');

      await user.click(getByRole('combobox', { name: 'Entries per page' }));
      await user.click(getByRole('option', { name: testPageSize.toString() }));

      expect(getByRole('combobox', { name: 'Entries per page' })).toHaveTextContent('20');

      expect(
        getByRole('button', {
          name: 'Save',
        })
      ).toBeEnabled();

      /**
       * using `userEvent.click` does not fire the submit event for the form :(
       * see – https://github.com/testing-library/user-event/issues/1075
       * see – https://github.com/testing-library/user-event/issues/1002
       */
      fireEvent.click(
        getByRole('button', {
          name: 'Save',
        })
      );

      await waitFor(() => {
        expect(getByText('This will modify all your settings')).toBeInTheDocument();
      });

      await user.click(getByText('Confirm'));

      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(mutateAsync).toHaveBeenCalledWith({
        pageSize: testPageSize,
        sort: 'createdAt:DESC',
      });
    });
  });
});
