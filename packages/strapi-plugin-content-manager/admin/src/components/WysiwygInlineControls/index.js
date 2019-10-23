/**
 *
 * WysiwygInlineControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';
import Wrapper from './Wrapper';

class StyleButton extends React.Component {
  handleClick = e => {
    e.preventDefault();

    if (!this.props.disabled) {
      this.props.handlers[this.props.handler](
        this.props.text,
        this.props.style
      );
    }
  };

  render() {
    const { active, className: type, disabled } = this.props;

    return (
      <Button
        active={active}
        disabled={disabled}
        onMouseDown={this.handleClick}
        type={type}
      >
        {!this.props.hideLabel && this.props.label}
      </Button>
    );
  }
}

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
        <StyleButton
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

/* eslint-disable react/default-props-match-prop-types */
StyleButton.defaultProps = {
  active: false,
  className: '',
  disabled: false,
  hideLabel: false,
  label: '',
  onToggle: () => {},
  onToggleBlock: () => {},
  style: '',
  text: '',
};

StyleButton.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  handler: PropTypes.string.isRequired,
  handlers: PropTypes.object.isRequired,
  hideLabel: PropTypes.bool,
  label: PropTypes.string,
  style: PropTypes.string,
  text: PropTypes.string,
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
