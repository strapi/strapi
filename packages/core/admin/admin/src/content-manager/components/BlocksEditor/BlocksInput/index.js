import * as React from 'react';

import PropTypes from 'prop-types';
import { Editable } from 'slate-react';
import { useTheme } from 'styled-components';

import { useBlocksStore } from '../hooks/useBlocksStore';
import { useModifiersStore } from '../hooks/useModifiersStore';

const getEditorStyle = (theme) => ({
  // The outline style is set on the wrapper with :focus-within
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spaces[2],
});

const baseRenderLeaf = (props, modifiers) => {
  // Recursively wrap the children for each active modifier
  const wrappedChildren = Object.entries(modifiers).reduce((currentChildren, modifierEntry) => {
    const [name, modifier] = modifierEntry;

    if (props.leaf[name]) {
      return modifier.renderLeaf(currentChildren);
    }

    return currentChildren;
  }, props.children);

  return <span {...props.attributes}>{wrappedChildren}</span>;
};

const baseRenderElement = (props, blocks) => {
  const block = blocks[props.element.type] || blocks.paragraph;

  return block.renderElement(props);
};

const BlocksInput = ({ readOnly }) => {
  const theme = useTheme();

  // Create renderLeaf function based on the modifiers store
  const modifiers = useModifiersStore();
  const renderLeaf = React.useCallback((props) => baseRenderLeaf(props, modifiers), [modifiers]);

  // Create renderElement function base on the blocks store
  const blocks = useBlocksStore();
  const renderElement = React.useCallback((props) => baseRenderElement(props, blocks), [blocks]);

  return (
    <Editable
      readOnly={readOnly}
      style={getEditorStyle(theme)}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
    />
  );
};

BlocksInput.propTypes = {
  readOnly: PropTypes.bool.isRequired,
};

export default BlocksInput;
