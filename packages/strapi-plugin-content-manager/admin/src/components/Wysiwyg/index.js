/**
 *
 * Wysiwyg
 *
 */
import React from 'react';
import {
  ContentState,
  EditorState,
  getDefaultKeyBinding,
  genKey,
  Modifier,
  RichUtils,
  SelectionState,
} from 'draft-js';
import PropTypes from 'prop-types';
import { isEmpty, isNaN, replace, words } from 'lodash';
import cn from 'classnames';
import Controls from 'components/WysiwygInlineControls';
import Drop from 'components/WysiwygDropUpload';
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';
import request from 'utils/request';
import CustomSelect from './customSelect';
import PreviewControl from './previewControl';
import PreviewWysiwyg from './previewWysiwyg';
import ToggleMode from './toggleMode';
import { CONTROLS } from './constants';
import {
  getBlockContent,
  getBlockStyle,
  getDefaultSelectionOffsets,
  getKeyCommandData,
  getOffSets,
} from './helpers';
import {
  createNewBlock,
  getNextBlocksList,
  getSelectedBlocksList,
  onTab,
  updateSelection,
} from './utils';
import styles from './styles.scss';

/* eslint-disable react/jsx-handler-names */
/* eslint-disable react/sort-comp */
class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      isDraging: false,
      isFocused: false,
      isFullscreen: false,
      isPreviewMode: false,
      headerValue: '',
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

  getChildContext = () => ({
    handleChangeSelect: this.handleChangeSelect,
    headerValue: this.state.headerValue,
    html: this.props.value,
    isPreviewMode: this.state.isPreviewMode,
    isFullscreen: this.state.isFullscreen,
    placeholder: this.props.placeholder,
  });

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }

    if (!isEmpty(this.props.value)) {
      this.setInitialValue(this.props);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.editorState !== this.state.editorState) {
      return true;
    }

    if (nextProps.resetProps !== this.props.resetProps) {
      return true;
    }

    if (nextState.isDraging !== this.state.isDraging) {
      return true;
    }

    if (nextState.isFocused !== this.state.isFocused) {
      return true;
    }

    if (nextState.isFullscreen !== this.state.isFullscreen) {
      return true;
    }

    if (nextState.isPreviewMode !== this.state.isPreviewMode) {
      return true;
    }

    if (nextState.headerValue !== this.state.headerValue) {
      return true;
    }

    return false;
  }

  componentDidUpdate(prevProps) {
    // Handle resetProps
    if (prevProps.resetProps !== this.props.resetProps) {
      this.setInitialValue(this.props);
    }
  }

  /**
   * Init the editor with data from
   * @param {[type]} props [description]
   */
  setInitialValue = props => {
    const contentState = ContentState.createFromText(props.value);
    const newEditorState = EditorState.createWithContent(contentState);
    const editorState = this.state.isFocused
      ? EditorState.moveFocusToEnd(newEditorState)
      : newEditorState;
    return this.setState({ editorState });
  };

  /**
   * Handler to add B, I, Strike, U, link
   * @param {String} content usually something like **textToReplace**
   * @param {String} style
   */
  addContent = (content, style) => {
    const selectedText = this.getSelectedText();
    // Retrieve the associated data for the type to add
    const { innerContent, endReplacer, startReplacer } = getBlockContent(style);
    // Replace the selected text by the markdown command or insert default text
    const defaultContent =
      selectedText === ''
        ? replace(content, 'textToReplace', innerContent)
        : replace(content, 'textToReplace', selectedText);
    // Get the current cursor position
    const cursorPosition = getOffSets(this.getSelection()).start;
    const textWithEntity = this.modifyBlockContent(defaultContent);
    // Highlight the text
    const { anchorOffset, focusOffset } = getDefaultSelectionOffsets(
      defaultContent,
      startReplacer,
      endReplacer,
      cursorPosition,
    );
    // Merge the current selection with the new one
    const updatedSelection = this.getSelection().merge({ anchorOffset, focusOffset });
    const newEditorState = EditorState.push(
      this.getEditorState(),
      textWithEntity,
      'insert-character',
    );
    // Update the parent reducer
    this.sendData(newEditorState);
    // Don't handle selection : the user has selected some text to be changed with the appropriate markdown
    if (selectedText !== '') {
      return this.setState(
        {
          editorState: newEditorState,
        },
        () => {
          this.focus();
        },
      );
    }

    return this.setState({
      // Highlight the text if the selection wad empty
      editorState: EditorState.forceSelection(newEditorState, updatedSelection),
    });
  };

  /**
   * Create an ordered list block
   * @return ContentBlock
   */
  addOlBlock = () => {
    // Get all the selected blocks
    const selectedBlocksList = getSelectedBlocksList(this.getEditorState());
    let newEditorState = this.getEditorState();

    // Check if the cursor is NOT at the beginning of a new line
    // So we need to move all the next blocks
    if (getOffSets(this.getSelection()).start !== 0) {
      // Retrieve all the blocks after the current position
      const nextBlocks = getNextBlocksList(newEditorState, this.getSelection().getStartKey());
      let liNumber = 1;

      // Loop to update each block after the inserted li
      nextBlocks.map((block, index) => {
        const previousContent =
          index === 0
            ? this.getEditorState()
              .getCurrentContent()
              .getBlockForKey(this.getCurrentAnchorKey())
            : newEditorState.getCurrentContent().getBlockBefore(block.getKey());
        // Check if there was an li before the position so we update the entire list bullets
        const number = previousContent ? parseInt(previousContent.getText().split('.')[0], 10) : 0;
        liNumber = isNaN(number) ? 1 : number + 1;
        const nextBlockText = index === 0 ? `${liNumber}. ` : nextBlocks.get(index - 1).getText();
        // Update the current block
        const newBlock = createNewBlock(nextBlockText, 'block-list', block.getKey());
        // Update the contentState
        const newContentState = this.createNewContentStateFromBlock(
          newBlock,
          newEditorState.getCurrentContent(),
        );
        newEditorState = EditorState.push(newEditorState, newContentState);
      });

      // Move the cursor to the correct position and add a space after '.'
      // 2 for the dot and the space after, we add the number length (10 = offset of 2)
      const offset = 2 + liNumber.toString().length;
      const updatedSelection = updateSelection(this.getSelection(), nextBlocks, offset);

      return this.setState({
        editorState: EditorState.acceptSelection(newEditorState, updatedSelection),
      });
    }

    // If the cursor is at the beginning we need to move all the content after the cursor so we don't loose the data
    selectedBlocksList.map((block, i) => {
      const selectedText = block.getText();
      const li = selectedText === '' ? `${i + 1}. ` : `${i + 1}. ${selectedText}`;
      const newBlock = createNewBlock(li, 'block-list', block.getKey());
      const newContentState = this.createNewContentStateFromBlock(
        newBlock,
        newEditorState.getCurrentContent(),
      );
      newEditorState = EditorState.push(newEditorState, newContentState);
    });

    // Update the parent reducer
    this.sendData(newEditorState);

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  };

  /**
   * Create an unordered list
   * @return ContentBlock
   */
  // NOTE: it's pretty much the same dynamic as above
  // We don't use the same handler because it needs less logic than a ordered list
  // so it's easier to maintain the code
  addUlBlock = () => {
    const selectedBlocksList = getSelectedBlocksList(this.getEditorState());
    let newEditorState = this.getEditorState();

    if (getOffSets(this.getSelection()).start !== 0) {
      const nextBlocks = getNextBlocksList(newEditorState, this.getSelection().getStartKey());

      nextBlocks.map((block, index) => {
        const nextBlockText = index === 0 ? '- ' : nextBlocks.get(index - 1).getText();
        const newBlock = createNewBlock(nextBlockText, 'block-list', block.getKey());
        const newContentState = this.createNewContentStateFromBlock(
          newBlock,
          newEditorState.getCurrentContent(),
        );
        newEditorState = EditorState.push(newEditorState, newContentState);
      });
      const updatedSelection = updateSelection(this.getSelection(), nextBlocks, 2);

      return this.setState({
        editorState: EditorState.acceptSelection(newEditorState, updatedSelection),
      });
    }

    selectedBlocksList.map(block => {
      const selectedText = block.getText();
      const li = selectedText === '' ? '- ' : `- ${selectedText}`;
      const newBlock = createNewBlock(li, 'block-list', block.getKey());
      const newContentState = this.createNewContentStateFromBlock(
        newBlock,
        newEditorState.getCurrentContent(),
      );
      newEditorState = EditorState.push(newEditorState, newContentState);
    });
    this.sendData(newEditorState);
    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  };

  /**
   * Handler to create header
   * @param {String} text header content
   */
  addBlock = text => {
    const nextBlockKey = this.getNextBlockKey(this.getCurrentAnchorKey()) || genKey();
    const newBlock = createNewBlock(text, 'header', nextBlockKey);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const newEditorState = this.createNewEditorState(newContentState, text);

    return this.setState(
      {
        editorState: newEditorState,
      },
      () => {
        this.focus();
      },
    );
  };

  /**
   * Handler used for code block and Img controls
   * @param {String} content the text that will be added
   * @param {String} style   the type
   */
  addSimpleBlockWithSelection = (content, style) => {
    const selectedText = this.getSelectedText();
    const { innerContent, endReplacer, startReplacer } = getBlockContent(style);
    const defaultContent =
      selectedText === ''
        ? replace(content, 'textToReplace', innerContent)
        : replace(content, 'textToReplace', selectedText);
    const newBlock = createNewBlock(defaultContent);
    const newContentState = this.createNewContentStateFromBlock(newBlock);
    const { anchorOffset, focusOffset } = getDefaultSelectionOffsets(
      defaultContent,
      startReplacer,
      endReplacer,
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

  /**
   * Update the current editorState
   * @param  {Map} newContentState
   * @param  {String} text            The text to add
   * @return {Map}                 EditorState
   */
  createNewEditorState = (newContentState, text) => {
    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(this.getEditorState(), newContentState);
    } else {
      const textWithEntity = this.modifyBlockContent(text);
      newEditorState = EditorState.push(this.getEditorState(), textWithEntity, 'insert-characters');
    }
    return newEditorState;
  };

  /**
   * Update the content of a block
   * @param  {Map} newBlock     The new block
   * @param  {Map} contentState The ContentState
   * @return {Map}              The updated block
   */
  createNewBlockMap = (newBlock, contentState) =>
    contentState.getBlockMap().set(newBlock.key, newBlock);

  createNewContentStateFromBlock = (
    newBlock,
    contentState = this.getEditorState().getCurrentContent(),
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

  /**
   * Retrieve the selected text
   * @return {Map}
   */
  getSelection = () => this.getEditorState().getSelection();

  /**
   * Retrieve the cursor anchor key
   * @return {String}
   */
  getCurrentAnchorKey = () => this.getSelection().getAnchorKey();

  /**
   * Retrieve the current content block
   * @return {Map} ContentBlock
   */
  getCurrentContentBlock = () =>
    this.getEditorState()
      .getCurrentContent()
      .getBlockForKey(this.getSelection().getAnchorKey());

  /**
   * Retrieve the block key after a specific one
   * @param  {String} currentBlockKey
   * @param  {Map} [editorState=this.getEditorState()]  The current EditorState or the updated one
   * @return {String}                                    The next block key
   */
  getNextBlockKey = (currentBlockKey, editorState = this.getEditorState()) =>
    editorState.getCurrentContent().getKeyAfter(currentBlockKey);

  getSelectedText = ({ start, end } = getOffSets(this.getSelection())) =>
    this.getCurrentContentBlock()
      .getText()
      .slice(start, end);

  handleBlur = () => {
    const target = {
      name: this.props.name,
      type: 'textarea',
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

    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    return this.uploadFile(files);
  };

  /**
   * Handler that listens for specific key commands
   * @param  {String} command
   * @param  {Map} editorState
   * @return {Bool}
   */
  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);

    if (command === 'bold' || command === 'italic' || command === 'underline') {
      const { content, style } = getKeyCommandData(command);
      this.addContent(content, style);
      return false;
    }

    if (newState && command !== 'backspace') {
      this.onChange(newState);
      return true;
    }

    return false;
  };

  /**
   * Handler to upload files on paste
   * @param  {Array<Blob>} files [description]
   * @return {}                  DraftHandleValue
   */
  handlePastedFiles = files => this.uploadFile(files);

  handleReturn = (e, editorState) => {
    const selection = editorState.getSelection();
    const currentBlock = editorState.getCurrentContent().getBlockForKey(selection.getStartKey());

    if (currentBlock.getText().split('')[0] === '-') {
      this.addUlBlock();
      return true;
    }

    if (
      currentBlock.getText().split('.').length > 1 &&
      !isNaN(parseInt(currentBlock.getText().split('.')[0], 10))
    ) {
      this.addOlBlock();
      return true;
    }

    return false;
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

  /**
   * Change the content of a block
   * @param  {String]} text
   * @param  {Map} [contentState=this.getEditorState().getCurrentContent()]
   * @return {Map}
   */
  modifyBlockContent = (text, contentState = this.getEditorState().getCurrentContent()) =>
    Modifier.replaceText(contentState, this.getSelection(), text);

  onChange = editorState => {
    this.setState({ editorState });
    this.sendData(editorState);
  };

  handleTab = e => {
    e.preventDefault();
    const newEditorState = onTab(this.getEditorState());

    return this.onChange(newEditorState);
  };

  /**
   * Update the parent reducer
   * @param  {Map} editorState [description]
   */
  sendData = editorState => {
    if (this.getEditorState().getCurrentContent() === editorState.getCurrentContent())
      return;

    this.props.onChange({
      target: {
        value: editorState.getCurrentContent().getPlainText(),
        name: this.props.name,
        type: 'textarea',
      },
    });
  }

  toggleFullScreen = e => {
    e.preventDefault();
    this.setState({
      isFullscreen: !this.state.isFullscreen,
      isPreviewMode: false,
    });
  };

  uploadFile = files => {
    const formData = new FormData();
    formData.append('files', files[0]);
    const headers = {
      'X-Forwarded-Host': 'strapi',
    };

    let newEditorState = this.getEditorState();

    const nextBlocks = getNextBlocksList(newEditorState, this.getSelection().getStartKey());
    // Loop to update each block after the inserted li
    nextBlocks.map((block, index) => {
      // Update the current block
      const nextBlockText = index === 0 ? `![Uploading ${files[0].name}]()` : nextBlocks.get(index - 1).getText();
      const newBlock = createNewBlock(nextBlockText, 'unstyled', block.getKey());
      // Update the contentState
      const newContentState = this.createNewContentStateFromBlock(
        newBlock,
        newEditorState.getCurrentContent(),
      );
      newEditorState = EditorState.push(newEditorState, newContentState);
    });

    const offset = `![Uploading ${files[0].name}]()`.length;
    const updatedSelection = updateSelection(this.getSelection(), nextBlocks, offset);
    this.setState({ editorState: EditorState.acceptSelection(newEditorState, updatedSelection) });

    return request('/upload', { method: 'POST', headers, body: formData }, false, false)
      .then(response => {
        const nextBlockKey = newEditorState
          .getCurrentContent()
          .getKeyAfter(newEditorState.getSelection().getStartKey());
        const content = `![text](${response[0].url})`;
        const newContentState = this.createNewContentStateFromBlock(
          createNewBlock(content, 'unstyled', nextBlockKey),
        );

        newEditorState = EditorState.push(newEditorState, newContentState);
        const updatedSelection = updateSelection(this.getSelection(), nextBlocks, 2);

        this.sendData(newEditorState);
        this.setState({ editorState: EditorState.acceptSelection(newEditorState, updatedSelection) });
      })
      .catch(() => {
        this.setState({ editorState: EditorState.undo(this.getEditorState()) });
      })
      .finally(() => {
        this.setState({ isDraging: false });
      });
  };

  renderDrop = () => (
    <Drop
      onDrop={this.handleDrop}
      onDragOver={this.handleDragOver}
      onDragLeave={this.handleDragLeave}
    />
  );

  render() {
    const { editorState, isPreviewMode, isFullscreen } = this.state;
    const editorStyle = isFullscreen ? { marginTop: '0' } : this.props.style;

    return (
      <div className={cn(isFullscreen && styles.fullscreenOverlay)}>
        {/* FIRST EDITOR WITH CONTROLS} */}
        <div
          className={cn(
            styles.editorWrapper,
            !this.props.deactivateErrorHighlight && this.props.error && styles.editorError,
            !isEmpty(this.props.className) && this.props.className,
          )}
          onClick={e => {
            if (isFullscreen) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragEnter={this.handleDragEnter}
          onDragOver={this.handleDragOver}
          style={editorStyle}
        >
          {this.state.isDraging && this.renderDrop()}
          <div className={styles.controlsContainer}>
            <CustomSelect />
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
            {!isFullscreen ? (
              <ToggleMode isPreviewMode={isPreviewMode} onClick={this.handleClickPreview} />
            ) : (
              <div style={{ marginRight: '10px' }} />
            )}
          </div>
          {/* WYSIWYG PREVIEW NOT FULLSCREEN */}
          {isPreviewMode ? (
            <PreviewWysiwyg data={this.props.value} />
          ) : (
            <div
              className={cn(styles.editor, isFullscreen && styles.editorFullScreen)}
              onClick={this.focus}
            >
              <WysiwygEditor
                blockStyleFn={getBlockStyle}
                editorState={editorState}
                handleKeyCommand={this.handleKeyCommand}
                handlePastedFiles={this.handlePastedFiles}
                handleReturn={this.handleReturn}
                keyBindingFn={this.mapKeyToEditorCommand}
                onBlur={this.handleBlur}
                onChange={this.onChange}
                onTab={this.handleTab}
                placeholder={this.props.placeholder}
                setRef={editor => (this.domEditor = editor)}
                stripPastedStyles
                tabIndex={this.props.tabIndex}
              />
              <input className={styles.editorInput} tabIndex="-1" />
            </div>
          )}
          {!isFullscreen && (
            <WysiwygBottomControls
              isPreviewMode={isPreviewMode}
              onClick={this.toggleFullScreen}
              onChange={this.handleDrop}
            />
          )}
        </div>
        {/* PREVIEW WYSIWYG FULLSCREEN */}
        {isFullscreen && (
          <div
            className={cn(styles.editorWrapper)}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ marginTop: '0' }}
          >
            <PreviewControl
              onClick={this.toggleFullScreen}
              characters={this.getCharactersNumber()}
            />
            <PreviewWysiwyg data={this.props.value} />
          </div>
        )}
      </div>
    );
  }
}

Wysiwyg.childContextTypes = {
  handleChangeSelect: PropTypes.func,
  headerValue: PropTypes.string,
  html: PropTypes.string,
  isFullscreen: PropTypes.bool,
  isPreviewMode: PropTypes.bool,
  placeholder: PropTypes.string,
  previewHTML: PropTypes.func,
};

Wysiwyg.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  error: false,
  onBlur: () => {},
  onChange: () => {},
  placeholder: '',
  resetProps: false,
  style: {},
  tabIndex: '0',
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
  resetProps: PropTypes.bool,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string,
};

export default Wysiwyg;
