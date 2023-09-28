import * as React from 'react';

import PropTypes from 'prop-types';
import { Editable, useSlate } from 'slate-react';
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
  const blockMatch = Object.values(blocks).find((block) => block.matchNode(props.element));
  const block = blockMatch || blocks.paragraph;

  return block.renderElement(props);
};

const BlocksInput = ({ readOnly }) => {
  const theme = useTheme();
  const editor = useSlate();

  // Create renderLeaf function based on the modifiers store
  const modifiers = useModifiersStore();
  const renderLeaf = React.useCallback((props) => baseRenderLeaf(props, modifiers), [modifiers]);

  // Create renderElement function base on the blocks store
  const blocks = useBlocksStore();
  const renderElement = React.useCallback((props) => baseRenderElement(props, blocks), [blocks]);

  const handleEnter = () => {
    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    const selectedBlock = Object.values(blocks).find((block) => block.matchNode(selectedNode));

    // Check if there's an enter handler for the selected block
    if (selectedBlock.handleEnterKey) {
      selectedBlock.handleEnterKey(editor);
    } else {
      // If not, insert a new paragraph
      blocks.paragraph.handleEnterKey(editor);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEnter();
    }
  };

  return (
    <Editable
      readOnly={readOnly}
      style={getEditorStyle(theme)}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
      onKeyDown={handleKeyDown}
    />
  );
};

BlocksInput.propTypes = {
  readOnly: PropTypes.bool.isRequired,
};

export default BlocksInput;
