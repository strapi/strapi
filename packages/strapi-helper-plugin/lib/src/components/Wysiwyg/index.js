/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {
  ContentState,
  convertFromHTML,
  // convertToRaw,
  Editor,
  EditorState,
  getDefaultKeyBinding,
  RichUtils,
} from 'draft-js';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import cn from 'classnames';

import Controls from 'components/WysiwygInlineControls';
import styles from './styles.scss';


const CONTROLS = [
  [
    {label: 'B', style: 'BOLD'},
    {label: 'I', style: 'ITALIC', className: 'styleButtonItalic'},
    {label: 'U', style: 'UNDERLINE'},
    {label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hide: true },
    {label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hide: true },
  ],
  [
    {label: '<>', style: 'code-block' },
    {label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hide: true },
  ],
];

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return styles.editorBlockquote;
    case 'code-block':
      return styles.editorCodeBlock;
    default: return null;
  }
};

/* eslint-disable  react/no-string-refs */
/* eslint-disable react/jsx-handler-names */
class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = { editorState: EditorState.createEmpty(), isFocused: false, initialValue: '', previewHTML: false };
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

    // Handle reset props
    if (nextProps.value === this.state.initialValue && this.state.hasInitialValue) {
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

    this.setState({ editorState, hasInitialValue: true, initialValue: props.value });
  }

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  previewHTML = () => {
    const blocksFromHTML = convertFromHTML(this.props.value);
    const contentState = ContentState.createFromBlockArray(blocksFromHTML);
    return EditorState.createWithContent(contentState);
  }

  render() {
    const { editorState } = this.state;

    return (
      <div className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)}>
        <div className={styles.controlsContainer}>
          {CONTROLS.map((value, key) => (
            <Controls
              key={key}
              buttons={value}
              editorState={editorState}
              onToggle={this.toggleInlineStyle}
              onToggleBlock={this.toggleBlockType}
              previewHTML={() => this.setState(prevState => ({ previewHTML: !prevState.previewHTML }))}
            />
          ))}
        </div>
        <div className={styles.editor} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onBlur={() => this.setState({ isFocused: false })}
            onChange={this.onChange}
            placeholder={this.props.placeholder}
            ref="editor"
            spellCheck
          />
          <input className={styles.editorInput} value="" tabIndex="-1" />
        </div>
      </div>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: false,
  onChange: () => {},
  placeholder: '',
  value: '',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default Wysiwyg;
