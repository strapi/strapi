import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, renderHook } from '@testing-library/react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';

import { useBlocksStore } from '../useBlocksStore';

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph.' }],
  },
];

const Wrapper = ({ children }) => {
  const editor = React.useMemo(() => withReact(createEditor()), []);

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialValue} editor={editor}>
          {children}
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

describe('useBlocksStore', () => {
  it('should return a store of blocks', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    const storeKeys = Object.keys(result.current);
    expect(storeKeys).toContain('paragraph');
    expect(storeKeys).toContain('heading');
    expect(storeKeys).toContain('link');
    expect(storeKeys).toContain('code');
    expect(storeKeys).toContain('quote');
    expect(storeKeys).toContain('list');
    expect(storeKeys).toContain('list-item');
    expect(storeKeys).toContain('image');

    Object.values(result.current).forEach((block) => {
      expect(block).toHaveProperty('renderElement');
      expect(block).toHaveProperty('variants');
    });
  });

  it('renders the blocks properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    // Paragraph
    render(result.current.paragraph.renderElement({ children: 'Some text' }), { wrapper: Wrapper });
    const paragraph = screen.getByText('Some text');
    expect(paragraph).toBeInTheDocument();

    // Heading
    render(
      result.current.heading.renderElement({
        children: 'Some heading',
        element: { level: 2 },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Some heading' });
    expect(heading).toBeInTheDocument();

    // Link
    render(
      result.current.link.renderElement({
        children: 'Some link',
        element: { url: 'https://example.com' },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const link = screen.getByRole('link', 'Some link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');

    // Code
    render(
      result.current.code.renderElement({
        children: 'Some code',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const code = screen.getByRole('code', 'Some code');
    expect(code).toBeInTheDocument();

    // Quote
    render(
      result.current.quote.renderElement({
        children: 'Some quote',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const quote = screen.getByRole('blockquote', 'Some quote');
    expect(quote).toBeInTheDocument();

    // List
    // render(
    //   result.current.list.renderElement({
    //     children: 'list item',
    //     element: {
    //       format: 'unordered',
    //     },
    //     attributes: {},
    //   })
    // );
    // const list = screen.getByRole('list', 'list item');
    // expect(list).toBeInTheDocument();

    // List item
    render(
      result.current['list-item'].renderElement({
        children: 'list item',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const listItem = screen.getByRole('listitem', 'list item');
    expect(listItem).toBeInTheDocument();

    // Image
    render(
      result.current.image.renderElement({
        children: '',
        element: {
          image: { url: 'https://example.com/image.png', alternativeText: 'Some image' },
        },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const image = screen.getByRole('img', { name: 'Some image' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
  });
});
