/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import showdown from 'showdown';
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
// import { stateFromMarkdown } from 'draft-js-import-markdown';
import { List } from 'immutable';
import PropTypes from 'prop-types';
import { isEmpty, isNaN, replace, trimEnd, trimStart, words } from 'lodash';
import cn from 'classnames';
import Controls from 'components/WysiwygInlineControls';
import Drop from 'components/WysiwygDropUpload';
import Select from 'components/InputSelect';
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';
import request from 'utils/request';
import { ToggleMode } from './components';
import { NEW_CONTROLS, SELECT_OPTIONS  } from './constants';
import { getBlockStyle, getInnerText, getOffSets } from './helpers';
import styles from './styles.scss';

/* eslint-disable react/jsx-handler-names */
/* eslint-disable react/sort-comp */
class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      isFocused: false,
      initialValue: '',
      isDraging: false,
      isPreviewMode: false,
      headerValue: '',
      toggleFullScreen: false,
    };

    this.focus = () => {
      this.setState({ isFocused: true });
      return this.domEditor.focus();
    };

    this.blur = () => {
      this.setState({ isFocused: false });
      return this.domEditor.blur();
    };
  }

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }

    if (!isEmpty(this.props.value)) {
      this.setInitialValue(this.props);
    }
    document.addEventListener('keydown', this.handleTabKey);
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

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleTabKey);
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

  addSimpleBlock = (content, style) => {
    const selectedText = this.getSelectedText();
    const defaultContent = style === 'code-block' ? 'code block' : 'quote';
    const innerContent = selectedText === '' ? replace(content, 'innerText', defaultContent) : replace(content, 'innerText', selectedText);
    const newBlock = this.createNewBlock(innerContent);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, innerContent);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addLink = () => {
    const selectedText = this.getSelectedText();
    const link = selectedText === '' ? ' [text](link)' : `[text](${selectedText})`;
    const text = Modifier.replaceText(this.getEditorState().getCurrentContent(), this.getSelection(), link);
    const newEditorState = EditorState.push(this.getEditorState(), text, 'insert-characters');

    if (selectedText !== '') {
      return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
    }

    const cursorPosition = getOffSets(this.getSelection()).start;
    const anchorOffset = cursorPosition - trimStart(link, ' [text](').length + link.length;
    const focusOffset = cursorPosition + trimEnd(link, ')').length;
    const updatedSelection = this.getSelection().merge({
      anchorOffset,
      focusOffset,
    });

    return this.setState({
      editorState: EditorState.forceSelection(newEditorState, updatedSelection),
    });
  }

  addLinkMediaBlockWithSelection = () => {
    const selectedText = this.getSelectedText();
    const link = selectedText === '' ? '![text](link)' : `![text](${selectedText})`;
    const newBlock = this.createNewBlock(link);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, link);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addLinkMediaBlock = (link) => {
    const { editorState } = this.state;
    const newBlock = this.createNewBlock(link);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = EditorState.push(
      editorState,
      newContentState,
    );

    this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addEntity = (text, style) => {
    const editorState = this.getEditorState();
    const selectedText = this.getSelectedText();

    // Don't handle selection
    if (selectedText !== '') {
      const textWithEntity = Modifier.replaceText(editorState.getCurrentContent(), this.getSelection(), replace(text, 'innerText', selectedText));
      const newEditorState = EditorState.push(editorState, textWithEntity, 'insert-characters');

      return this.setState({
        editorState: EditorState.moveFocusToEnd(newEditorState),
      }, () => {
        this.focus();
      });
    }

    const cursorPosition = getOffSets(this.getSelection()).start;
    const textWithEntity = Modifier.replaceText(editorState.getCurrentContent(), this.getSelection(), getInnerText(style));
    const anchorOffset = cursorPosition - trimStart(getInnerText(style), '*_~').length + getInnerText(style).length;
    const focusOffset = cursorPosition + trimEnd(getInnerText(style), '*_~').length;
    const updatedSelection = this.getSelection().merge({
      anchorOffset,
      focusOffset,
    });
    const newEditorState = EditorState.push(editorState, textWithEntity, 'insert-character');

    return this.setState({
      editorState: EditorState.forceSelection(newEditorState, updatedSelection),
    });
  }

  addOlBlock = () => {
    const currentBlockKey = this.getCurrentAnchorKey();
    const previousContent = this.getEditorState().getCurrentContent().getBlockForKey(currentBlockKey).getText();
    const nextBlockKey = this.getNextBlockKey(currentBlockKey) || genKey();
    const number = previousContent ? parseInt(previousContent.split('.')[0], 10) : 0;
    const liNumber = isNaN(number) ? 1 : number + 1;
    const selectedText = this.getSelectedText();
    const li = selectedText === '' ? `${liNumber}. ` : `${liNumber}. ${selectedText}`;
    const newBlock = this.createNewBlock(li, 'block-ul', nextBlockKey);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, li);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  addUlBlock = () => {
    const nextBlockKey = this.getNextBlockKey(this.getCurrentAnchorKey()) || genKey();
    const selectedText = this.getSelectedText();
    const li = selectedText === '' ? '- ' : `- ${selectedText}`;
    const newBlock = this.createNewBlock(li, 'block-ul', nextBlockKey);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, li);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  }

  createNewEditorState = (newContentState, text) => {
    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(
        this.getEditorState(),
        newContentState,
      );
    } else {
      const textWithEntity =  Modifier.replaceText(this.getEditorState().getCurrentContent(), this.getSelection(), text);
      newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');
    }
    return newEditorState;
  }

  createNewBlock = (text = '', type = 'unstyled', key = genKey()) => (
    new ContentBlock({
      key,
      type,
      text,
      charaterList: List([]),
    })
  );

  createNewBlockMap = (newBlock, contentState) => contentState.getBlockMap().set(newBlock.key, newBlock);

  createNewContentStateFromBlock = (newBlock, contentState = this.getEditorState().getCurrentContent()) => (
    ContentState
      .createFromBlockArray(this.createNewBlockMap(newBlock, contentState).toArray())
      .set('selectionBefore', contentState.getSelectionBefore())
      .set('selectionAfter', contentState.getSelectionAfter())
  )

  getCharactersNumber = (editorState = this.getEditorState()) => {
    const plainText = editorState.getCurrentContent().getPlainText();
    const spacesNumber = plainText.split(' ').length;

    return words(plainText).join('').length + spacesNumber - 1;
  }

  getEditorState = () => this.state.editorState;

  getSelection = () => this.getEditorState().getSelection();

  getCurrentAnchorKey = () => this.getSelection().getAnchorKey();

  getCurrentBlockMap = () => this.getEditorState().getCurrentContent().getBlockMap().toJS();

  getCurrentContentBlock = () => this.getEditorState().getCurrentContent().getBlockForKey(this.getSelection().getAnchorKey());

  getNextBlockKey = (currentBlockKey) => this.getEditorState().getCurrentContent().getKeyAfter(currentBlockKey);

  getSelectedText = () => {
    const { start, end } = getOffSets(this.getSelection());

    return this.getCurrentContentBlock().getText().slice(start, end);
  }

  handleChangeSelect = ({ target }) => {
    this.setState({ headerValue: target.value });
    const selectedText = this.getSelectedText();
    const title = selectedText === '' ? `${target.value} ` : `${target.value} ${selectedText}`;
    const newBlock = this.createNewBlock(title, 'block-ul');
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, title);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState), headerValue: '' });
  }

  handleClickPreview = () => this.setState({ isPreviewMode: !this.state.isPreviewMode });

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

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    const selection = editorState.getSelection();
    const currentBlock = editorState.getCurrentContent().getBlockForKey(selection.getStartKey());

    if (currentBlock.getText().split('')[0] === '-' && command === 'split-block') {
      this.addUlBlock();
      return true;
    }

    if (currentBlock.getText().split('.').length > 1 && !isNaN(parseInt(currentBlock.getText().split('.')[0], 10)) && command === 'split-block') {
      this.addOlBlock();
      return true;
    }

    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }


  handleTabKey = (e) => {
    if (e.keyCode === 9 /* TAB */ && this.state.isFocused) {
      e.preventDefault();
      const textWithEntity =  Modifier.replaceText(this.getEditorState().getCurrentContent(), this.getSelection(), '  ');
      const newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');

      return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
    }
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

  onChange = (editorState) => {
    // Update the state and force the focus
    this.setState({ editorState });
    this.props.onChange({ target: {
      value: editorState.getCurrentContent().getPlainText(),
      name: this.props.name,
      type: 'textarea',
    }});
  }

  // NOTE: this need to be changed to preview markdown
  previewHTML = () => {
    const converter = new showdown.Converter();
    // TODO: parse html to add empty blocks
    // TODO handle img
    const html = converter.makeHtml(this.props.value);
    const blocksFromHTML = convertFromHTML(html);
    // Make sure blocksFromHTML.contentBlocks !== null
    if (blocksFromHTML.contentBlocks) {
      const contentState = ContentState.createFromBlockArray(blocksFromHTML);
      return EditorState.createWithContent(contentState);
    }

    // Prevent errors if value is empty
    return EditorState.createEmpty();
  }

  toggleFullScreen = (e) => {
    e.preventDefault();
    this.setState({
      toggleFullScreen: !this.state.toggleFullScreen,
    }, () => {
      this.focus();
    });
  }

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  render() {
    const { editorState, isPreviewMode } = this.state;

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
          <div style={{ minWidth: '161px', marginLeft: '8px', marginRight: '5px' }}>
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
                addLink: this.addLink,
                addLinkMediaBlockWithSelection: this.addLinkMediaBlockWithSelection,
                addOlBlock: this.addOlBlock,
                addSimpleBlock: this.addSimpleBlock,
                addUlBlock: this.addUlBlock,
              }}
              onToggle={this.toggleInlineStyle}
              onToggleBlock={this.toggleBlockType}
            />
          ))}
          <div className={styles.toggleModeWrapper}>
            <ToggleMode isPreviewMode={isPreviewMode} onClick={this.handleClickPreview} />
          </div>
        </div>
        {isPreviewMode? (
          <div className={styles.editor}>
            <WysiwygEditor
              blockStyleFn={getBlockStyle}
              editorState={this.previewHTML()}
              onChange={() => {}}
              placeholder={this.props.placeholder}
              spellCheck
            />
            <input className={styles.editorInput} value="" tabIndex="-1" />
          </div>
        ) : (
          <div className={styles.editor} onClick={this.focus}>
            <WysiwygEditor
              blockStyleFn={getBlockStyle}
              editorState={editorState}
              handleBeforeInput={this.handleBeforeInput}
              handleKeyCommand={this.handleKeyCommand}
              keyBindingFn={this.mapKeyToEditorCommand}
              onBlur={this.blur}
              onChange={this.onChange}
              placeholder={this.props.placeholder}
              setRef={(editor) => this.domEditor = editor}
              spellCheck
            />
            <input className={styles.editorInput} value="" tabIndex="-1" />
          </div>
        ) }
        <WysiwygBottomControls charactersNumber={this.getCharactersNumber()} onClick={this.toggleFullScreen} />
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
