import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL, screen, waitFor, fireEvent } from '@testing-library/react';
import { TrackingProvider } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import ConfigureTheView from '..';
import { sortOptions, pageSizes } from '../../../../constants';

const mutateAsync = jest.fn();
jest.mock('../../../../hooks/useConfig', () => ({
  useConfig: jest.fn(() => ({
    mutateConfig: {
      mutateAsync,
    },
  })),
}));
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => jest.fn()),
}));

const renderConfigure = (
  config = {
    pageSize: pageSizes[0],
    sort: sortOptions[0].value,
  }
) =>
  renderTL(
    <IntlProvider locale="en" messages={{}}>
      <TrackingProvider>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <ConfigureTheView config={config} />
          </MemoryRouter>
        </ThemeProvider>
      </TrackingProvider>
    </IntlProvider>
  );

describe('Upload - Configure', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial render', () => {
    it('renders and matches the snapshot', async () => {
      const { container } = renderConfigure();

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveFocus();
        expect(screen.getByText('Configure the view - Media Library')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('save', () => {
    it('save renders and is initially disabled', async () => {
      renderConfigure();

      await waitFor(() => {
        expect(screen.getByText('Configure the view - Media Library')).toBeInTheDocument();
        expect(screen.getByTestId('save')).toHaveAttribute('disabled');
      });
    });
  });

  describe('user actions', () => {
    const testPageSize = pageSizes[1];

    it('modify settings', async () => {
      renderConfigure();

      fireEvent.mouseDown(screen.getByTestId('pageSize-select'));
      fireEvent.click(screen.getByTestId(`pageSize-option-${testPageSize}`));
      await waitFor(() => {
        expect(screen.getByTestId('save')).toBeEnabled();
      });

      fireEvent.click(screen.getByTestId('save'));
      await waitFor(() => {
        expect(screen.getByText('This will modify all your settings')).toBeInTheDocument();
      });

      fireEvent.click(document.getElementById('confirm-delete'));
      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledTimes(1);
        expect(mutateAsync).toHaveBeenCalledWith({
          pageSize: testPageSize,
          sort: 'createdAt:DESC',
        });
      });
    });
  });
});
