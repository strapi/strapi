/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {
  ContentBlock,
  ContentState,
  convertFromHTML,
  EditorState,
  getDefaultKeyBinding,
  genKey,
  Modifier,
  RichUtils,
} from 'draft-js';
import { List } from 'immutable';
import PropTypes from 'prop-types';
import { isEmpty, replace, trimStart, trimEnd } from 'lodash';
import cn from 'classnames';
import Controls from 'components/WysiwygInlineControls';
import Drop from 'components/WysiwygDropUpload';
import Select from 'components/InputSelect';
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';
import request from 'utils/request';
import { END_REPLACER, NEW_CONTROLS, SELECT_OPTIONS, START_REPLACER } from './constants';
import { getBlockStyle, getInnerText, getOffSets } from './helpers';
import styles from './styles.scss';

/* eslint-disable  react/no-string-refs */ // NOTE: need to check eslint
/* eslint-disable react/jsx-handler-names */
class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      isFocused: false,
      initialValue: '',
      isDraging: false,
      headerValue: '',
      toggleFullScreen: false,
    };

    this.focus = () => {
      this.setState({ isFocused: true });
      return this.domEditor.focus();
    };
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

  onChange = (editorState) => {
    this.setState({ editorState });
    this.props.onChange({ target: {
      value: editorState.getCurrentContent().getPlainText(),
      name: this.props.name,
      type: 'textarea',
    }});
  }

  /**
   * Init the editor with data from
   * @param {[type]} props [description]
   */
  setInitialValue = (props) => {
    const contentState = ContentState.createFromText(props.value);
    let editorState = EditorState.createWithContent(contentState);

    // Get the cursor at the end
    editorState = EditorState.moveFocusToEnd(editorState);
    this.setState({ editorState, hasInitialValue: true, initialValue: props.value });
  }

  getEditorState = () => this.state.editorState;

  getSelection = () => this.getEditorState().getSelection();

  getCurrentContentBlock = () => this.getEditorState().getCurrentContent().getBlockForKey(this.getSelection().getAnchorKey());

  getSelectedText = () => {
    const { start, end } = getOffSets(this.getSelection());

    return this.getCurrentContentBlock().getText().slice(start, end);
  }

  handleChangeSelect = ({ target }) => {
    this.setState({ headerValue: target.value });
    const splitData = target.value.split('.');
    this.addEntity(splitData[0], splitData[1]);
  }

  handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!this.state.isDraging) {
      this.setState({ isDraging: true });
    }
  }

  handleDragLeave = () => this.setState({ isDraging: false });

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDrop = (e) => {
    e.preventDefault();
    const { dataTransfer: { files} } = e;
    const formData = new FormData();
    formData.append('files', files[0]);
    const headers = {
      'X-Forwarded-Host': 'strapi',
    };

    return request('/upload', {method: 'POST', headers, body: formData }, false, false)
      .then(response => {
        const link = `![text](${response[0].url})`;
        this.addLinkMediaBlock(link);
      })
      .catch(err => {
        console.log('error', err.response);
      })
      .finally(() => {
        this.setState({ isDraging: false });
      });
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

  createNewBlock = (text = '', type = 'unstyled') => (
    new ContentBlock({
      key: genKey(),
      type,
      text,
      charaterList: List([]),
    })
  );

  addLinkMediaBlockWithSelection = () => {
    const selectedText = this.getSelectedText();
    const link = selectedText === '' ? '![text](link)' : `![text](${selectedText})`;

    const newBlock = this.createNewBlock(link);
    const contentState = this.getEditorState().getCurrentContent();
    const newBlockMap = contentState.getBlockMap().set(newBlock.key, newBlock);
    const newContentState = ContentState
      .createFromBlockArray(newBlockMap.toArray())
      .set('selectionBefore', contentState.getSelectionBefore())
      .set('selectionAfter', contentState.getSelectionAfter());

    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(
        this.getEditorState(),
        newContentState,
      );
    } else {
      const textWithEntity =  Modifier.replaceText(this.getEditorState().getCurrentContent(), this.getSelection(), link);
      newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');
    }

    // TODO : handle selection
    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addLinkMediaBlock = (link) => {
    const { editorState } = this.state;
    const newBlock = new ContentBlock({
      key: genKey(),
      type: 'unstyled',
      text: link,
      charaterList: List([]),
    });
    const contentState = editorState.getCurrentContent();
    const newBlockMap = contentState.getBlockMap().set(newBlock.key, newBlock);
    const newContentState = ContentState
      .createFromBlockArray(newBlockMap.toArray())
      .set('selectionBefore', contentState.getSelectionBefore())
      .set('selectionAfter', contentState.getSelectionAfter());

    const newEditorState = EditorState.push(
      editorState,
      newContentState,
    );

    this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addEntity = (text, style) => {
    const editorState = this.state.editorState;
    const currentContent = editorState.getCurrentContent();
    // Get the selected text
    const selection = editorState.getSelection();
    const anchorKey = selection.getAnchorKey();
    const currentContentBlock = currentContent.getBlockForKey(anchorKey);
    // Range of the text we want to replace
    const { start, end } = getOffSets(selection);
    // Retrieve the selected text
    const selectedText = currentContentBlock.getText().slice(start, end);
    const innerText = selectedText === '' ? getInnerText(style) : replace(text, 'innerText', selectedText);

    const trimedStart = trimStart(innerText, START_REPLACER).length;
    const trimedEnd = trimEnd(innerText, END_REPLACER).length;
    // Set the correct offset
    const focusOffset = start === end ? trimedEnd : start + trimedEnd;
    const anchorOffset = start + innerText.length - trimedStart;
    // Merge the old selection with the new one so the editorState is updated
    const updateSelection = selection.merge({
      anchorOffset,
      focusOffset,
    });

    // Dynamically add some content to the one selected
    const textWithEntity = Modifier.replaceText(currentContent, selection, innerText);

    // Push the new content to the editorState
    const newEditorState = EditorState.push(editorState, textWithEntity, 'insert-characters');

    // SetState and force focus
    this.setState({
      editorState: EditorState.forceSelection(newEditorState, updateSelection),
      headerValue: '',
    }, () => {
      this.focus();
    });
  }

  addUlBlock = () => {
    const selectedText = this.getSelectedText();
    const link = selectedText === '' ? '- ' : `- ${selectedText}`;

    const newBlock = this.createNewBlock(link, 'block-ul');
    const contentState = this.getEditorState().getCurrentContent();
    const newBlockMap = contentState.getBlockMap().set(newBlock.key, newBlock);
    const newContentState = ContentState
      .createFromBlockArray(newBlockMap.toArray())
      .set('selectionBefore', contentState.getSelectionBefore())
      .set('selectionAfter', contentState.getSelectionAfter());

    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(
        this.getEditorState(),
        newContentState,
      );
    } else {
      const textWithEntity =  Modifier.replaceText(this.getEditorState().getCurrentContent(), this.getSelection(), link);
      newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');
    }

    // TODO : handle selection
    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  toggleFullScreen = (e) => {
    e.preventDefault();
    this.setState({
      toggleFullScreen: !this.state.toggleFullScreen,
    }, () => {
      this.focus();
    });
  }

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    const selection = editorState.getSelection();
    const currentBlock = editorState.getCurrentContent().getBlockForKey(selection.getStartKey());

    if (currentBlock.getText().split('')[0] === '-' && command === 'split-block') {
      this.addUlBlock();
      return true;
    }

    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  // NOTE: this need to be changed to preview markdown
  previewHTML = () => {
    const blocksFromHTML = convertFromHTML(this.props.value);

    // Make sure blocksFromHTML.contentBlocks !== null
    if (blocksFromHTML.contentBlocks) {
      const contentState = ContentState.createFromBlockArray(blocksFromHTML);
      return EditorState.createWithContent(contentState);
    }

    // Prevent errors if value is empty
    return EditorState.createEmpty();
  }

  render() {
    const { editorState } = this.state;

    return (
      <div
        className={cn(
          styles.editorWrapper,
          this.state.isFocused && styles.editorFocus,
        )}
        onDragEnter={this.handleDragEnter}
        onDragOver={this.handleDragOver}
      >
        {this.state.isDraging && (
          <Drop onDrop={this.handleDrop} onDragOver={this.handleDragOver} onDragLeave={this.handleDragLeave} />
        )}
        <div className={styles.controlsContainer}>
          <div style={{ minWidth: '161px', marginLeft: '8px' }}>
            <Select
              name="headerSelect"
              onChange={this.handleChangeSelect}
              value={this.state.headerValue}
              selectOptions={SELECT_OPTIONS}
            />
          </div>
          {NEW_CONTROLS.map((value, key) => (
            <Controls
              key={key}
              buttons={value}
              editorState={editorState}
              handlers={{
                addEntity: this.addEntity,
                addLinkMediaBlockWithSelection: this.addLinkMediaBlockWithSelection,
                addUlBlock: this.addUlBlock,
              }}
              onToggle={this.toggleInlineStyle}
              onToggleBlock={this.toggleBlockType}
            />
          ))}
        </div>
        <div className={styles.editor} onClick={this.focus}>
          <WysiwygEditor
            blockStyleFn={getBlockStyle}
            editorState={editorState}
            // handleBeforeInput={this.handleBeforeInput}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onBlur={() => this.setState({ isFocused: false })}
            onChange={this.onChange}
            placeholder={this.props.placeholder}
            setRef={(editor) => this.domEditor = editor}
            spellCheck
          />
          <input className={styles.editorInput} value="" tabIndex="-1" />
        </div>
        <WysiwygBottomControls onClick={this.toggleFullScreen} />
      </div>
    );
  }
}

// NOTE: handle defaultProps!
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
