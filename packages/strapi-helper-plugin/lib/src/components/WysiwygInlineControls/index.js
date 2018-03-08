/**
 *
 * WysiwygInlineControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

const TOGGLE_BLOCK_TYPES = [
  'blockquote',
  'code-block',
  'ordered-list-item',
  'unordered-list-item',
];

class StyleButton extends React.Component {
  handleClick = (e) => {
    e.preventDefault();

    if (TOGGLE_BLOCK_TYPES.includes(this.props.style)) {
      return this.props.onToggleBlock(this.props.style);
    }

    return this.props.onToggle(this.props.style);
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
        {!this.props.hide && this.props.label}
      </div>
    );
  }
}

const  WysiwygInlineControls = ({ buttons, editorState, onToggle, onToggleBlock }) => {
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
          label={type.label}
          onToggle={onToggle}
          onToggleBlock={onToggleBlock}
          style={type.style}
          hide={type.hide || false}
        />
      ))}
    </div>
  );
};

StyleButton.defaultProps = {
  active: false,
  className: '',
  hide: false,
  label: '',
  onToggle: () => {},
  onToggleBlock: () => {},
  style: '',
};

StyleButton.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  hide: PropTypes.bool,
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
  onToggle: PropTypes.func,
  onToggleBlock: PropTypes.func,
};

export default WysiwygInlineControls;
