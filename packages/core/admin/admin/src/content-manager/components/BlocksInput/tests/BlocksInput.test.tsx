/* eslint-disable testing-library/no-node-access */
import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';

import { BlocksInput } from '../BlocksInput';

import { blocksData } from './mock-schema';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: () => ({ components: { 'media-library': jest.fn() } }),
}));

type BlocksEditorProps = React.ComponentProps<typeof BlocksInput>;

const setup = (props: Partial<BlocksEditorProps>) =>
  render(
    <BlocksInput
      attribute={{ type: 'blocks' }}
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
            <DndProvider backend={HTML5Backend}>{children}</DndProvider>
          </IntlProvider>
        </ThemeProvider>
      ),
    }
  );

describe('BlocksInput', () => {
  it('should render blocks without error', async () => {
    setup({ value: undefined });

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

    expect(screen.getByText('This is italic text').parentElement).toHaveStyle({
      'font-style': 'italic',
    });

    expect(screen.getByText('This is underlined text').parentElement).toHaveStyle({
      'text-decoration': 'underline',
    });

    expect(screen.getByText('This is deleted text').parentElement).toHaveStyle({
      'text-decoration': 'line-through',
    });

    expect(screen.getByText('click me').parentElement).toHaveStyle({
      'font-style': 'italic',
    });

    const codeText = screen.getByText('<textarea>').parentElement as HTMLElement;
    expect(window.getComputedStyle(codeText).fontFamily).toMatch(/\bmonospace\b/i);

    const linkElement = screen.getByRole('link', { name: /click me/ });
    expect(linkElement).toHaveAttribute('href', 'https://example.com');

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
