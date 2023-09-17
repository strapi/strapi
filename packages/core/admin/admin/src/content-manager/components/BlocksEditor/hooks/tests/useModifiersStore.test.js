import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, renderHook, screen } from '@testing-library/react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';

import { useModifiersStore } from '../useModifiersStore';

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

describe('useModifiersStore', () => {
  it('should return a store of modifiers', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    const storeKeys = Object.keys(result.current);

    expect(storeKeys).toContain('bold');
    expect(storeKeys).toContain('italic');
    expect(storeKeys).toContain('underline');
    expect(storeKeys).toContain('strikethrough');
    expect(storeKeys).toContain('code');

    Object.values(result.current).forEach((modifier) => {
      expect(modifier).toHaveProperty('icon');
      expect(modifier).toHaveProperty('label.id');
      expect(modifier).toHaveProperty('label.defaultMessage');
      expect(modifier).toHaveProperty('checkIsActive');
      expect(modifier).toHaveProperty('handleToggle');
      expect(modifier).toHaveProperty('renderLeaf');
    });
  });

  it('should render a bold modifier properly', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    render(result.current.bold.renderLeaf('This is bold text'), { wrapper: Wrapper });
    const boldText = screen.getByText('This is bold text');
    expect(boldText).toHaveStyle('font-weight: 600');
  });

  it('should render an italic modifier properly', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    render(result.current.italic.renderLeaf('This is italic text'), { wrapper: Wrapper });
    const italicText = screen.getByText('This is italic text');
    expect(italicText).toHaveStyle('font-style: italic');
  });

  it('should render an underline modifier properly', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    render(result.current.underline.renderLeaf('This is underlined text'), { wrapper: Wrapper });
    const underlineText = screen.getByText('This is underlined text');
    expect(underlineText).toHaveStyle('text-decoration: underline');
  });

  it('should render a strikethrough modifier properly', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    render(result.current.strikethrough.renderLeaf('This is strikethrough text'), {
      wrapper: Wrapper,
    });
    const strikethroughText = screen.getByText('This is strikethrough text');
    expect(strikethroughText).toHaveStyle('text-decoration: line-through');
  });

  it('should render a code modifier properly', () => {
    const { result } = renderHook(useModifiersStore, { wrapper: Wrapper });

    render(result.current.code.renderLeaf('This is code text'), { wrapper: Wrapper });
    const codeText = screen.getByText('This is code text');
    expect(window.getComputedStyle(codeText).fontFamily).toMatch(/\bmonospace\b/i);
  });
});
