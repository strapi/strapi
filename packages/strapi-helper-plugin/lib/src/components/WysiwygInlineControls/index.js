/**
 *
 * WysiwygInlineControls
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

const CONTROLS = [
  {label: 'B', style: 'BOLD'},
  {label: 'I', style: 'ITALIC', className: 'styleButtonItalic'},
  {label: 'U', style: 'UNDERLINE'},
  {label: 'UL', style: 'unordered-list-item'},
  {label: 'OL', style: 'ordered-list-item'},
];

class StyleButton extends React.Component {
  handleClick = (e) => {
    e.preventDefault();

    if (['UL', 'OL'].includes(this.props.label)) {
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
      {this.props.label}
      </div>
    );
  }
}

const  WysiwygInlineControls = ({ editorState, onToggle, onToggleBlock, previewHTML }) => {
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  const currentStyle = editorState.getCurrentInlineStyle();

  return (
    <div className={cn(styles.wysiwygInlineControls)}>
      {CONTROLS.map(type => (
          <StyleButton
            key={type.label}
            active={type.style === blockType || currentStyle.has(type.style)}
            className={type.className}
            label={type.label}
            onToggle={onToggle}
            onToggleBlock={onToggleBlock}
            style={type.style}
          />
        ))}
        <StyleButton
          label={'TOGGLE'}
          onToggle={previewHTML}
        />
    </div>
  );
}

StyleButton.defaultProps = {
  active: false,
  className: '',
  label: '',
  onToggle: () => {},
  style: '',
};

StyleButton.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  label: PropTypes.string,
  onToggle: PropTypes.func,
  style: PropTypes.string
};

WysiwygInlineControls.defaultProps = {
  onToggle: () => {},
};

WysiwygInlineControls.propTypes = {
 editorState: PropTypes.object.isRequired,
 onToggle: PropTypes.func,
};

export default WysiwygInlineControls;
