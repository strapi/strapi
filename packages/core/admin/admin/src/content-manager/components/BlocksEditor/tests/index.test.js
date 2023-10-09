import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import Blocks from '../index';

import { blocksData } from './mock-schema';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: () => ({ components: { 'media-library': jest.fn() } }),
}));

const setup = (props) =>
  render(
    <Blocks
      intlLabel={{ id: 'blocks', defaultMessage: 'blocks type' }}
      name="blocks-editor"
      hint="blocks description"
      placeholder={{ id: 'blocksPlaceholder', defaultMessage: 'blocks placeholder' }}
      onChange={jest.fn()}
      disabled={false}
      {...props}
    />,
    {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider messages={{}} locale="en">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }
  );

describe('BlocksEditor', () => {
  it('should render blocks without error', async () => {
    setup({ value: null });

    expect(screen.getByText('blocks type')).toBeInTheDocument();
    expect(screen.getByText('blocks description')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('blocks placeholder')).toBeInTheDocument();
    });
  });

  it('should render blocks with error', () => {
    setup({ error: 'field is required', value: blocksData });

    expect(screen.getByText(/field is required/));
  });

  it('should render blocks with data', () => {
    setup({ value: blocksData });

    expect(screen.getByText('This is bold text').parentElement).toHaveStyle({
      'font-weight': 600,
    });

    expect(screen.getByText('This is deleted text').parentElement).toHaveStyle({
      'text-decoration': 'line-through',
    });

    expect(screen.getByText('click me').parentElement).toHaveStyle({
      'font-style': 'italic',
    });

    const linkElement = screen.getByRole('link', { name: /click me/ });
    expect(linkElement).toHaveAttribute('href', 'https://example.com');

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
