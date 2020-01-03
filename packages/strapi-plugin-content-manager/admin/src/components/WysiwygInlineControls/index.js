/**
 *
 * WysiwygInlineControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';
import Wrapper from './Wrapper';

const WysiwygInlineControls = ({
  buttons,
  disabled,
  editorState,
  handlers,
  onToggle,
  onToggleBlock,
}) => {
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  const currentStyle = editorState.getCurrentInlineStyle();

  return (
    <Wrapper>
      {buttons.map(type => (
        <Button
          key={type.label}
          active={type.style === blockType || currentStyle.has(type.style)}
          className={type.className}
          disabled={disabled}
          handler={type.handler}
          handlers={handlers}
          hideLabel={type.hideLabel || false}
          label={type.label}
          onToggle={onToggle}
          onToggleBlock={onToggleBlock}
          style={type.style}
          text={type.text}
        />
      ))}
    </Wrapper>
  );
};

WysiwygInlineControls.defaultProps = {
  buttons: [],
  disabled: false,
  onToggle: () => {},
  onToggleBlock: () => {},
};

WysiwygInlineControls.propTypes = {
  buttons: PropTypes.array,
  disabled: PropTypes.bool,
  editorState: PropTypes.object.isRequired,
  handlers: PropTypes.object.isRequired,
  onToggle: PropTypes.func,
  onToggleBlock: PropTypes.func,
};

export default WysiwygInlineControls;
