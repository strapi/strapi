/**
 *
 * WysiwygInlineControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

class StyleButton extends React.Component {
  handleClick = (e) => {
    e.preventDefault();
    this.props.handlers[this.props.handler](this.props.style);
  }

  render() {
    return (
      <div
        className={cn(
          this.props.active && styles.styleButtonActive,
          styles.styleButton,
          this.props.className && styles[this.props.className],
        )}
        onMouseDown={this.handleClick}
      >
        {!this.props.hideLabel && this.props.label}
      </div>
    );
  }
}

const  WysiwygInlineControls = ({ buttons, editorState, handlers, onToggle, onToggleBlock }) => {
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  const currentStyle = editorState.getCurrentInlineStyle();

  return (
    <div className={cn(styles.wysiwygInlineControls)}>
      {buttons.map(type => (
        <StyleButton
          key={type.label}
          active={type.style === blockType || currentStyle.has(type.style)}
          className={type.className}
          handler={type.handler}
          handlers={handlers}
          hideLabel={type.hideLabel || false}
          label={type.label}
          onToggle={onToggle}
          onToggleBlock={onToggleBlock}
          style={type.style}
        />
      ))}
    </div>
  );
};

StyleButton.defaultProps = {
  active: false,
  className: '',
  hideLabel: false,
  label: '',
  onToggle: () => {},
  onToggleBlock: () => {},
  style: '',
};

StyleButton.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  handler: PropTypes.string.isRequired,
  handlers: PropTypes.object.isRequired,
  hideLabel: PropTypes.bool,
  label: PropTypes.string,
  onToggle: PropTypes.func,
  onToggleBlock: PropTypes.func,
  style: PropTypes.string,
};

WysiwygInlineControls.defaultProps = {
  buttons: [],
  onToggle: () => {},
  onToggleBlock: () => {},
};

WysiwygInlineControls.propTypes = {
  buttons: PropTypes.array,
  editorState: PropTypes.object.isRequired,
  handlers: PropTypes.object.isRequired,
  onToggle: PropTypes.func,
  onToggleBlock: PropTypes.func,
};

export default WysiwygInlineControls;
