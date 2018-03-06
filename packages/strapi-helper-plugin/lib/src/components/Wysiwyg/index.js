/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {  ContentState, convertFromHTML, Editor, EditorState, getDefaultKeyBinding, RichUtils, convertToRaw } from 'draft-js';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import cn from 'classnames';

import Controls from 'components/WysiwygInlineControls';
import styles from './styles.scss';

const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};
function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}

class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = { editorState: EditorState.createEmpty(), isFocused: false };
    this.focus = () => {
      this.setState({ isFocused: true });
      return this.refs.editor.focus();
    }
  }

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }

    if (!isEmpty(this.props.value)) {
      this.setInitialValue(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value && !this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }
  }

  handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  onChange = (editorState) => {
    this.setState({ editorState });
    this.props.onChange({ target: {
      value: editorState.getCurrentContent().getPlainText(),
      name: this.props.name,
      type: 'textarea',
    }});
  }

  mapKeyToEditorCommand = (e) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        this.state.editorState,
        4, /* maxDepth */
      );
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  }

  toggleBlockType = (blockType) => {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  toggleInlineStyle = (inlineStyle) => {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  setInitialValue = (props) => {
    const contentState = ContentState.createFromText(props.value);
    let editorState = EditorState.createWithContent(contentState);

    // Get the cursor at the end
    editorState = EditorState.moveFocusToEnd(editorState);

    this.setState({ editorState, hasInitialValue: true });
  }

  previewHTML = () => {
    const blocksFromHTML = convertFromHTML(this.props.value);
    const contentState = ContentState.createFromBlockArray(blocksFromHTML);
    const editorState = EditorState.createWithContent(contentState);
    this.setState({ editorState });
  }

  render() {
    const { editorState } = this.state;

    return (
      <div className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)}>
        <Controls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
          onToggleBlock={this.toggleBlockType}
          previewHTML={this.previewHTML}
        />
        <div className={styles.editor} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onBlur={() => this.setState({ isFocused: false })}
            onChange={this.onChange}
            placeholder={this.props.placeholder}
            ref="editor"
            spellCheck={true}
          />
          <input className={styles.editorInput} value="" tabIndex="-1" />
        </div>
      </div>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: false,
  placeholder: '',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  placeholder: PropTypes.string,
};

export default Wysiwyg;
