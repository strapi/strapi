/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {
  ContentBlock,
  ContentState,
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
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';
import request from 'utils/request';
import { CustomSelect, PreviewControl, PreviewWysiwyg, ToggleMode } from './components';
import { CONTROLS } from './constants';
import { getBlockContent, getBlockStyle, getDefaultSelectionOffsets, getOffSets } from './helpers';
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
      isFullscreen: false,
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
    isFocused: this.state.isFocused,
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

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value && !this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }

    // Handle reset props
    if (nextProps.value === this.state.initialValue && this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }
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
      defaultContent,
    );
    const { anchorOffset, focusOffset } = getDefaultSelectionOffsets(
      defaultContent,
      startReplacer,
      endReplacer,
      cursorPosition,
    );
    const updatedSelection = this.getSelection().merge({ anchorOffset, focusOffset });
    const newEditorState = EditorState.push(
      this.getEditorState(),
      textWithEntity,
      'insert-character',
    );

    // Don't handle selection
    if (selectedText !== '') {
      return this.setState(
        {
          editorState: EditorState.moveFocusToEnd(newEditorState),
        },
        () => {
          this.focus();
        },
      );
    }

    return this.setState({
      editorState: EditorState.forceSelection(newEditorState, updatedSelection),
    });
  };

  addOlBlock = () => {
    const selectedBlocksList = this.getSelectedBlocksList();
    let newEditorState = this.getEditorState();

    if (getOffSets(this.getSelection()).start !== 0) {
      const nextBlocks = newEditorState
        .getCurrentContent()
        .getBlockMap()
        .toSeq()
        .skipUntil((_, k) => k === this.getSelection().getStartKey())
        .toList()
        .shift()
        .concat([
          new ContentBlock({ key: genKey(), type: 'unstyled', text: '', charaterList: List([]) }),
        ]);

      nextBlocks.map((block, index) => {
        const previousContent =
          index === 0
            ? this.getEditorState()
              .getCurrentContent()
              .getBlockForKey(this.getCurrentAnchorKey())
            : newEditorState.getCurrentContent().getBlockBefore(block.getKey());
        const number = previousContent ? parseInt(previousContent.getText().split('.')[0], 10) : 0;
        const liNumber = isNaN(number) ? 1 : number + 1;
        const nextBlockText = index === 0 ? `${liNumber}.` : nextBlocks.get(index - 1).getText();
        const newBlock = this.createNewBlock(nextBlockText, 'block-list', block.getKey());
        const newContentState = this.createNewContentStateFromBlock(
          newBlock,
          newEditorState.getCurrentContent(),
        );
        newEditorState = EditorState.push(newEditorState, newContentState);
      });

      const updatedSelection = this.getSelection().merge({
        anchorKey: nextBlocks.get(0).getKey(),
        focusKey: nextBlocks.get(0).getKey(),
        anchorOffset: 2,
        focusOffset: 2,
      });

      return this.setState({
        editorState: EditorState.acceptSelection(newEditorState, updatedSelection),
      });
    }

    selectedBlocksList.map((block, i) => {
      const selectedText = block.getText();
      const li = selectedText === '' ? `${i + 1}.` : `${i + 1}. ${selectedText}`;
      const newBlock = this.createNewBlock(li, 'block-list', block.getKey());
      const newContentState = this.createNewContentStateFromBlock(
        newBlock,
        newEditorState.getCurrentContent(),
      );
      newEditorState = EditorState.push(newEditorState, newContentState);
    });

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
  };

  addUlBlock = () => {
    const selectedBlocksList = this.getSelectedBlocksList();
    let newEditorState = this.getEditorState();

    if (getOffSets(this.getSelection()).start !== 0) {
      const nextBlocks = newEditorState
        .getCurrentContent()
        .getBlockMap()
        .toSeq()
        .skipUntil((_, k) => k === this.getSelection().getStartKey())
        .toList()
        .shift()
        .concat([
          new ContentBlock({ key: genKey(), type: 'unstyled', text: '', charaterList: List([]) }),
        ]);

      nextBlocks.map((block, index) => {
        const nextBlockText = index === 0 ? '-' : nextBlocks.get(index - 1).getText();
        const newBlock = this.createNewBlock(nextBlockText, 'block-list', block.getKey());
        const newContentState = this.createNewContentStateFromBlock(
          newBlock,
          newEditorState.getCurrentContent(),
        );
        newEditorState = EditorState.push(newEditorState, newContentState);
      });

      const updatedSelection = this.getSelection().merge({
        anchorKey: nextBlocks.get(0).getKey(),
        focusKey: nextBlocks.get(0).getKey(),
        anchorOffset: 1,
        focusOffset: 1,
      });

      return this.setState({
        editorState: EditorState.acceptSelection(newEditorState, updatedSelection),
      });
    }

    selectedBlocksList.map(block => {
      const selectedText = block.getText();
      const li = selectedText === '' ? '-' : `- ${selectedText}`;
      const newBlock = this.createNewBlock(li, 'block-list', block.getKey());
      const newContentState = this.createNewContentStateFromBlock(
        newBlock,
        newEditorState.getCurrentContent(),
      );
      newEditorState = EditorState.push(newEditorState, newContentState);
    });

    return this.setState({ editorState: EditorState.moveFocusToEnd(newEditorState) });
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

  createNewEditorState = (newContentState, text) => {
    let newEditorState;

    if (getOffSets(this.getSelection()).start !== 0) {
      newEditorState = EditorState.push(this.getEditorState(), newContentState);
    } else {
      const textWithEntity = Modifier.replaceText(
        this.getEditorState().getCurrentContent(),
        this.getSelection(),
        text,
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

  getSelection = () => this.getEditorState().getSelection();

  getCurrentAnchorKey = () => this.getSelection().getAnchorKey();

  getCurrentContentBlock = () =>
    this.getEditorState()
      .getCurrentContent()
      .getBlockForKey(this.getSelection().getAnchorKey());

  getNextBlockKey = (currentBlockKey, editorState = this.getEditorState()) =>
    editorState.getCurrentContent().getKeyAfter(currentBlockKey);

  getSelectedText = ({ start, end } = getOffSets(this.getSelection())) =>
    this.getCurrentContentBlock()
      .getText()
      .slice(start, end);

  getSelectedBlocksList = (editorState = this.getEditorState()) => {
    const selectionState = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const startKey = selectionState.getStartKey();
    const endKey = selectionState.getEndKey();
    const blockMap = contentState.getBlockMap();
    return blockMap
      .toSeq()
      .skipUntil((_, k) => k === startKey)
      .takeUntil((_, k) => k === endKey)
      .concat([[endKey, blockMap.get(endKey)]])
      .toList();
  };

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

    if (command === 'bold' || command === 'italic' || command === 'underline') {
      let content;
      let style;

      switch (command) {
        case 'bold':
          content = '**textToReplace**';
          style = 'BOLD';
          break;
        case 'italic':
          content = '*textToReplace*';
          style = 'ITALIC';
          break;
        case 'underline':
          content = '__textToReplace__';
          style = 'UNDERLINE';
          break;
        default:
          content = '';
          style = '';
      }
      this.addContent(content, style);
      return false;
    }

    if (newState && command !== 'backspace') {
      this.onChange(newState);
      return true;
    }

    return false;
  };

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

  toggleFullScreen = e => {
    e.preventDefault();
    this.setState({
      isFullscreen: !this.state.isFullscreen,
      isPreviewMode: false,
    });
  };

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  renderDrop = () => (
    <Drop
      onDrop={this.handleDrop}
      onDragOver={this.handleDragOver}
      onDragLeave={this.handleDragLeave}
    />
  );

  render() {
    const { editorState, isFocused, isPreviewMode, isFullscreen } = this.state;
    const editorStyle = isFullscreen ? { marginTop: '0' } : this.props.style;
    // console.log(editorState.getSele().toJS());
    return (
      <div className={cn(isFullscreen && styles.fullscreenOverlay)}>
        {/* FIRST EDITOR WITH CONTROLS} */}
        <div
          className={cn(
            styles.editorWrapper,
            this.state.isFocused && styles.editorFocus,
            !this.props.deactivateErrorHighlight && this.props.error && styles.editorError,
            !isEmpty(this.props.className) && this.props.className,
            isFullscreen && isFocused && styles.fullscreenFocus,
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
            <PreviewWysiwyg />
          ) : (
            <div
              className={cn(styles.editor, isFullscreen && styles.editorFullScreen)}
              onClick={this.focus}
            >
              <WysiwygEditor
                blockStyleFn={getBlockStyle}
                editorState={editorState}
                handleKeyCommand={this.handleKeyCommand}
                handleReturn={this.handleReturn}
                keyBindingFn={this.mapKeyToEditorCommand}
                onBlur={this.handleBlur}
                onChange={this.onChange}
                placeholder={this.props.placeholder}
                setRef={editor => (this.domEditor = editor)}
                stripPastedStyles
              />
              <input className={styles.editorInput} value="" tabIndex="-1" />
            </div>
          )}
          {!isFullscreen && (
            <WysiwygBottomControls
              charactersNumber={this.getCharactersNumber()}
              onClick={this.toggleFullScreen}
            />
          )}
        </div>
        {/* PREVIEW WYSIWYG FULLSCREEN */}
        {isFullscreen && (
          <div
            className={cn(styles.editorWrapper, isFocused && styles.fullscreenPreviewFocused)}
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
            <PreviewWysiwyg />
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
  isFocused: PropTypes.bool,
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
