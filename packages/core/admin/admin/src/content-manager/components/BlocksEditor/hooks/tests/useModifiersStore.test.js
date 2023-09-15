import * as React from 'react';

import { renderHook } from '@testing-library/react';
import PropTypes from 'prop-types';
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
    <Slate initialValue={initialValue} editor={editor}>
      {children}
    </Slate>
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
});
