import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render as renderTL, screen, waitFor, fireEvent } from '@testing-library/react';
import { TrackingProvider } from '@strapi/helper-plugin';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';

import { Settings } from '../Settings';
import { pageSizes, sortOptions } from '../../../../../constants';

const testPageSize = pageSizes[0];
const testSort = sortOptions[0].value;

const renderSettings = ({ pageSize = testPageSize, sort = testSort, onChange = jest.fn() }) =>
  renderTL(
    <IntlProvider locale="en" messages={{}}>
      <TrackingProvider>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter>
            <Settings sort={sort} pageSize={pageSize} onChange={onChange} />
          </MemoryRouter>
        </ThemeProvider>
      </TrackingProvider>
    </IntlProvider>
  );

describe('Upload - Configure | Settings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial render', () => {
    it('renders and matches the snapshot', async () => {
      const { container } = renderSettings({});

      await waitFor(() => {
        expect(screen.getByText('Entries per page')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('pageSize', () => {
    it('renders all page Sizes', async () => {
      renderSettings({});

      fireEvent.mouseDown(screen.getByTestId('pageSize-select'));
      await waitFor(() => {
        pageSizes.forEach((size) => {
          const option = screen.getByTestId(`pageSize-option-${size}`);
          expect(option).toBeInTheDocument();
          expect(option).toHaveAttribute('data-strapi-value', `${size}`);
        });
      });
    });

    it('call onChange when changing page size', async () => {
      const onChange = jest.fn();
      renderSettings({ onChange });

      const testValue = pageSizes[1];

      fireEvent.mouseDown(screen.getByTestId('pageSize-select'));
      fireEvent.click(screen.getByTestId(`pageSize-option-${testValue}`));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'pageSize', value: testValue } });
      });
    });
  });

  describe('sort', () => {
    it('renders all sort options', async () => {
      renderSettings({});

      fireEvent.mouseDown(screen.getByTestId('sort-select'));
      await waitFor(() => {
        sortOptions.forEach((filter) => {
          const option = screen.getByTestId(`sort-option-${filter.value}`);
          expect(option).toBeInTheDocument();
          expect(option).toHaveAttribute('data-strapi-value', `${filter.value}`);
        });
      });
    });

    it('call onChange when changing sort', async () => {
      const onChange = jest.fn();
      renderSettings({ onChange });

      const testValue = sortOptions[1].value;

      fireEvent.mouseDown(screen.getByTestId('sort-select'));
      fireEvent.click(screen.getByTestId(`sort-option-${testValue}`));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ target: { name: 'sort', value: testValue } });
      });
    });
  });
});
