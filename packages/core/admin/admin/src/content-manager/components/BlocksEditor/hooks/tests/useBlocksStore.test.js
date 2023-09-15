import * as React from 'react';

import { renderHook } from '@testing-library/react';
import PropTypes from 'prop-types';
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
    <Slate initialValue={initialValue} editor={editor}>
      {children}
    </Slate>
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
    });
  });
});
