import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import CodeMirror from 'codemirror';
import PreviewWysiwyg from '../PreviewWysiwyg';
import EditorWrapper from './EditorWrapper';
import { EditorAndPreviewWrapper } from './WysiwygStyles';
import newlineAndIndentContinueMarkdownList from './utils/continueList';

const Editor = ({ name, onChange, textareaRef, editorRef, isPreviewMode, value, error }) => {
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    editorRef.current = CodeMirror.fromTextArea(textareaRef.current, {
      lineWrapping: true,
      extraKeys: {
        Enter: 'newlineAndIndentContinueMarkdownList',
        Tab: false,
        'Shift-Tab': false,
      },
      readOnly: false,
    });

    if (initialValueRef.current) {
      editorRef.current.setValue(initialValueRef.current);
      // initialValueRef.current = value;
    }

    CodeMirror.commands.newlineAndIndentContinueMarkdownList = newlineAndIndentContinueMarkdownList;
    editorRef.current.on('change', doc =>
      onChangeRef.current({ target: { name, value: doc.getValue(), type: 'wysiwyg' } })
    );
  }, [editorRef, textareaRef, editorRef]);

  useEffect(() => {
    if (isPreviewMode) {
      editorRef.current.setOption('readOnly', 'nocursor');
    } else {
      editorRef.current.setOption('readOnly', false);
    }
  }, [isPreviewMode, editorRef]);

  useEffect(() => {
    if (error) {
      editorRef.current.setOption('screenReaderLabel', error);
    } else {
      // to replace with translation
      editorRef.current.setOption('screenReaderLabel', 'Editor');
    }
  }, [error]);

  return (
    <EditorAndPreviewWrapper>
      <EditorWrapper>
        <textarea ref={textareaRef}></textarea>
      </EditorWrapper>
      {isPreviewMode && <PreviewWysiwyg data={value} />}
    </EditorAndPreviewWrapper>
  );
};

Editor.defaultProps = {
  onChange: () => {},
  isPreviewMode: false,
  value: '',
  error: undefined,
};

Editor.propTypes = {
  onChange: PropTypes.func,
  textareaRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  isPreviewMode: PropTypes.bool,
  value: PropTypes.string,
  error: PropTypes.string,
};

export default Editor;
