import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import Blocks from '../index';

const setup = (props) =>
  render(
    <Blocks
      intlLabel={{ id: 'blocks', defaultMessage: 'blocks type' }}
      name="blocks-editor"
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
  it('should render blocks without error', () => {
    setup();

    expect(screen.getByText('blocks type')).toBeInTheDocument();
  });

  it('should render blocks with error', () => {
    setup({ error: 'field is required' });

    expect(screen.getByText(/field is required/));
  });

  it('should render blocks with data', () => {
    const { container } = setup();

    const strongElement = container.querySelector('strong');
    expect(strongElement.textContent).toBe('This is bold text');

    const StrikethroughElement = container.querySelector('del');
    expect(StrikethroughElement.textContent).toBe('This is deleted text');

    const linkElement = screen.getByRole('link', { name: /click me/ });
    expect(linkElement).toHaveAttribute('href', 'https://example.com');

    const italicElement = screen.getByText('click me').closest('em');
    expect(italicElement).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
