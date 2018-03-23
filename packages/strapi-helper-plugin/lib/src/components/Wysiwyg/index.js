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
  SelectionState,
} from 'draft-js';
import { List } from 'immutable';
import PropTypes from 'prop-types';
import { isEmpty, isNaN, replace, words } from 'lodash';
import cn from 'classnames';
import Controls from 'components/WysiwygInlineControls';
import Drop from 'components/WysiwygDropUpload';
import Select from 'components/InputSelect';
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';
import request from 'utils/request';
import { ToggleMode } from './components';
import { CONTROLS, SELECT_OPTIONS } from './constants';
import converter from './converter';
import { getBlockContent, getBlockStyle, getDefaultSelectionOffsets, getOffSets } from './helpers';
import decorator from './decorator';
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
  setInitialValue = props => {
    const contentState = ContentState.createFromText(props.value);
    const editorState = EditorState.createWithContent(contentState);
    this.setState({
      editorState: EditorState.moveFocusToEnd(editorState),
      hasInitialValue: true,
      initialValue: props.value,
    });
  };

  addContent = (content, style) => {
    const selectedText = this.getSelectedText();
    const { innerContent, endReplacer, startReplacer } = getBlockContent(style);
    const defaultContent =
      selectedText === ''
        ? replace(content, 'textToReplace', innerContent)
        : replace(content, 'textToReplace', selectedText);
    const cursorPosition = getOffSets(this.getSelection()).start;
    const textWithEntity = Modifier.replaceText(
      this.getEditorState().getCurrentContent(),
      this.getSelection(),
      defaultContent
    );
    const { anchorOffset, focusOffset } = getDefaultSelectionOffsets(
      defaultContent,
      startReplacer,
      endReplacer,
      cursorPosition
    );
    const updatedSelection = this.getSelection().merge({ anchorOffset, focusOffset });
    const newEditorState = EditorState.push(
      this.getEditorState(),
      textWithEntity,
      'insert-character'
    );

    // Don't handle selection
    if (selectedText !== '') {
      return this.setState(
        {
          editorState: EditorState.moveFocusToEnd(newEditorState),
        },
        () => {
          this.focus();
        }
      );
    }

    return this.setState({
      editorState: EditorState.forceSelection(newEditorState, updatedSelection),
    });
  };

  addOlBlock = () => {
    const currentBlockKey = this.getCurrentAnchorKey();
    const previousContent = this.getEditorState()
      .getCurrentContent()
      .getBlockForKey(currentBlockKey)
      .getText();
    const number = previousContent ? parseInt(previousContent.split('.')[0], 10) : 0;
    const liNumber = isNaN(number) ? 1 : number + 1;
    const selectedText = this.getSelectedText();
    const li = selectedText === '' ? `${liNumber}. ` : `${liNumber}. ${selectedText}`;

    return this.addBlock(li);
  };

  addUlBlock = () => {
    const selectedText = this.getSelectedText();
    const li = selectedText === '' ? '- ' : `- ${selectedText}`;

    return this.addBlock(li);
  };

  addBlock = text => {
    const nextBlockKey = this.getNextBlockKey(this.getCurrentAnchorKey()) || genKey();
    const newBlock = this.createNewBlock(text, 'block-list', nextBlockKey);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, text);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  };

  addSimpleBlockWithSelection = (content, style) => {
    const selectedText = this.getSelectedText();
    const { innerContent, endReplacer, startReplacer } = getBlockContent(style);
    const defaultContent =
      selectedText === ''
        ? replace(content, 'textToReplace', innerContent)
        : replace(content, 'textToReplace', selectedText);
    const newBlock = this.createNewBlock(defaultContent);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const { anchorOffset, focusOffset } = getDefaultSelectionOffsets(
      defaultContent,
      startReplacer,
      endReplacer
    );
    let newEditorState = this.createNewEditorState(newContentState, defaultContent);
    const updatedSelection =
      getOffSets(this.getSelection()).start === 0
        ? this.getSelection().merge({ anchorOffset, focusOffset })
        : new SelectionState({
          anchorKey: newBlock.getKey(),
          anchorOffset,
          focusOffset,
          focusKey: newBlock.getKey(),
          isBackward: false,
        });

    newEditorState = EditorState.acceptSelection(newEditorState, updatedSelection);

    return this.setState({
      editorState: EditorState.forceSelection(newEditorState, newEditorState.getSelection()),
    });
  };

  createNewEditorState = (newContentState, text) => {
    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(this.getEditorState(), newContentState);
    } else {
      const textWithEntity = Modifier.replaceText(
        this.getEditorState().getCurrentContent(),
        this.getSelection(),
        text
      );
      newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');
    }
    return newEditorState;
  };

  createNewBlock = (text = '', type = 'unstyled', key = genKey()) =>
    new ContentBlock({ key, type, text, charaterList: List([]) });

  createNewBlockMap = (newBlock, contentState) =>
    contentState.getBlockMap().set(newBlock.key, newBlock);

  createNewContentStateFromBlock = (
    newBlock,
    contentState = this.getEditorState().getCurrentContent()
  ) =>
    ContentState.createFromBlockArray(this.createNewBlockMap(newBlock, contentState).toArray())
      .set('selectionBefore', contentState.getSelectionBefore())
      .set('selectionAfter', contentState.getSelectionAfter());

  getCharactersNumber = (editorState = this.getEditorState()) => {
    const plainText = editorState.getCurrentContent().getPlainText();
    const spacesNumber = plainText.split(' ').length;

    return words(plainText).join('').length + spacesNumber - 1;
  };

  getEditorState = () => this.state.editorState;

  getSelection = () => this.getEditorState().getSelection();

  getCurrentAnchorKey = () => this.getSelection().getAnchorKey();

  getCurrentContentBlock = () =>
    this.getEditorState()
      .getCurrentContent()
      .getBlockForKey(this.getSelection().getAnchorKey());

  getNextBlockKey = currentBlockKey =>
    this.getEditorState()
      .getCurrentContent()
      .getKeyAfter(currentBlockKey);

  getSelectedText = ({ start, end } = getOffSets(this.getSelection())) =>
    this.getCurrentContentBlock()
      .getText()
      .slice(start, end);

  handleBlur = () => {
    const target = {
      name: this.props.name,
      type: 'wysiwyg',
      value: this.getEditorState()
        .getCurrentContent()
        .getPlainText(),
    };
    this.props.onBlur({ target });
    this.blur();
  };

  handleChangeSelect = ({ target }) => {
    this.setState({ headerValue: target.value });
    const selectedText = this.getSelectedText();
    const title = selectedText === '' ? `${target.value} ` : `${target.value} ${selectedText}`;
    this.addBlock(title);

    return this.setState({ headerValue: '' });
  };

  handleClickPreview = () => this.setState({ isPreviewMode: !this.state.isPreviewMode });

  handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();

    if (!this.state.isDraging) {
      this.setState({ isDraging: true });
    }
  };

  handleDragLeave = () => this.setState({ isDraging: false });

  handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  handleDrop = e => {
    e.preventDefault();

    if (this.state.isPreviewMode) {
      return this.setState({ isDraging: false });
    }

    const { dataTransfer: { files } } = e;
    const formData = new FormData();
    formData.append('files', files[0]);
    const headers = {
      'X-Forwarded-Host': 'strapi',
    };

    return request('/upload', { method: 'POST', headers, body: formData }, false, false)
      .then(response => {
        const { editorState } = this.state;
        const link = `![text](${response[0].url})`;
        const newBlock = this.createNewBlock(link);
        const newContentState = this.createNewContentStateFromBlock(newBlock);
        const newEditorState = EditorState.push(editorState, newContentState);

        this.setState({ editorState: newEditorState });
        this.props.onChange({
          target: {
            value: newEditorState.getCurrentContent().getPlainText(),
            name: this.props.name,
            type: 'textarea',
          },
        });
      })
      .catch(err => {
        console.log('error', err.response);
      })
      .finally(() => {
        this.setState({ isDraging: false });
      });
  };

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    const selection = editorState.getSelection();
    const currentBlock = editorState.getCurrentContent().getBlockForKey(selection.getStartKey());

    if (currentBlock.getText().split('')[0] === '-' && command === 'split-block') {
      this.addUlBlock();
      return true;
    }

    if (
      currentBlock.getText().split('.').length > 1 &&
      !isNaN(parseInt(currentBlock.getText().split('.')[0], 10)) &&
      command === 'split-block'
    ) {
      this.addOlBlock();
      return true;
    }

    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  };

  handleTabKey = e => {
    if (e.keyCode === 9 /* TAB */ && this.state.isFocused) {
      e.preventDefault();
      const textWithEntity = Modifier.replaceText(
        this.getEditorState().getCurrentContent(),
        this.getSelection(),
        '  '
      );
      const newEditorState = EditorState.push(
        this.getEditorState(),
        textWithEntity,
        'insert-characters'
      );

      return this.setState({ editorState: newEditorState });
    }
  };

  mapKeyToEditorCommand = e => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(e, this.state.editorState, 4 /* maxDepth */);
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState);
      }
      return;
    }

    return getDefaultKeyBinding(e);
  };

  onChange = editorState => {
    // Update the state
    this.setState({ editorState });
    this.props.onChange({
      target: {
        value: editorState.getCurrentContent().getPlainText(),
        name: this.props.name,
        type: 'textarea',
      },
    });
  };

  previewHTML = () => {
    const html = converter.makeHtml(this.props.value);
    const blocksFromHTML = convertFromHTML(html);
    // Make sure blocksFromHTML.contentBlocks !== null
    if (blocksFromHTML.contentBlocks) {
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap
      );
      return EditorState.createWithContent(contentState, decorator);
    }

    // Prevent errors if value is empty
    return EditorState.createEmpty();
  };

  toggleFullScreen = e => {
    e.preventDefault();
    this.setState(
      {
        toggleFullScreen: !this.state.toggleFullScreen,
      },
      () => {
        this.focus();
      }
    );
  };

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
          !this.props.deactivateErrorHighlight && this.props.error && styles.editorError,
          !isEmpty(this.props.className) && this.props.className
        )}
        onDragEnter={this.handleDragEnter}
        onDragOver={this.handleDragOver}
        style={this.props.style}
      >
        {this.state.isDraging && (
          <Drop
            onDrop={this.handleDrop}
            onDragOver={this.handleDragOver}
            onDragLeave={this.handleDragLeave}
          />
        )}
        <div className={styles.controlsContainer}>
          <div style={{ minWidth: '161px', marginLeft: '8px', marginRight: '5px' }}>
            <Select
              disabled={isPreviewMode}
              name="headerSelect"
              onChange={this.handleChangeSelect}
              value={this.state.headerValue}
              selectOptions={SELECT_OPTIONS}
            />
          </div>
          {CONTROLS.map((value, key) => (
            <Controls
              key={key}
              buttons={value}
              disabled={isPreviewMode}
              editorState={editorState}
              handlers={{
                addContent: this.addContent,
                addOlBlock: this.addOlBlock,
                addSimpleBlockWithSelection: this.addSimpleBlockWithSelection,
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
        {isPreviewMode ? (
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
              onBlur={this.handleBlur}
              onChange={this.onChange}
              placeholder={this.props.placeholder}
              setRef={editor => (this.domEditor = editor)}
            />
            <input className={styles.editorInput} value="" tabIndex="-1" />
          </div>
        )}
        <WysiwygBottomControls
          charactersNumber={this.getCharactersNumber()}
          onClick={this.toggleFullScreen}
        />
      </div>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  error: false,
  onBlur: () => {},
  onChange: () => {},
  placeholder: '',
  style: {},
  value: '',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  value: PropTypes.string,
};

export default Wysiwyg;
