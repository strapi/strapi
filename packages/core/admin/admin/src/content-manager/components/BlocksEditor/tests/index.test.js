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
  it('should render blocks without error', async () => {
    setup();

    expect(screen.getByText('blocks type')).toBeInTheDocument();
    expect(screen.getByText(/A line of text in a paragraph./));
  });

  it('should render blocks with error', async () => {
    setup({ error: 'field is required' });

    expect(screen.getByText(/field is required/));
  });
});
