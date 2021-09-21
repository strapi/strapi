import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ButtonText, P } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import Editor from './Editor';
import WysiwygNav from './WysiwygNav';
import WysiwygFooter from './WysiwygFooter';
import WysiwygExpand from './WysiwygExpand';
import MediaLibrary from './MediaLibrary';

import { WysiwygWrapper } from './WysiwygStyles';
import {
  markdownHandler,
  listHandler,
  titleHandler,
  insertImage,
  quoteAndCodeHandler,
} from './utils/utils';

const Wysiwyg = ({ label, placeholder, name, onChange, value, error }) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const editorRefExpanded = useRef(null);
  const [visiblePopover, setVisiblePopover] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [mediaLibVisible, setMediaLibVisible] = useState(false);
  const [isExpandMode, setIsExpandMode] = useState(false);

  const handleToggleMediaLib = () => setMediaLibVisible(prev => !prev);
  const handleTogglePopover = () => setVisiblePopover(prev => !prev);
  const handleTogglePreviewMode = () => setIsPreviewMode(prev => !prev);

  const handleActionClick = (value, currentEditorRef, togglePopover) => {
    switch (value) {
      case 'Link':
      case 'Strikethrough': {
        markdownHandler(currentEditorRef, value);
        togglePopover();
        break;
      }
      case 'Code':
      case 'Quote': {
        quoteAndCodeHandler(currentEditorRef, value);
        togglePopover();
        break;
      }
      case 'Bold':
      case 'Italic':
      case 'Underline': {
        markdownHandler(currentEditorRef, value);
        break;
      }
      case 'BulletList':
      case 'NumberList': {
        listHandler(currentEditorRef, value);
        togglePopover();
        break;
      }
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        titleHandler(currentEditorRef, value);
        break;
      }
      default:
        return;
    }
  };

  const handleSubmitImage = (files, currentEditorRef, toggleMediaLib, togglePopover) => {
    toggleMediaLib();
    togglePopover();
    insertImage(currentEditorRef, files);
  };

  const handleToggleExpand = collapse => {
    setIsExpandMode(prev => !prev);

    if (collapse === 'collapse' && value !== undefined) {
      editorRef.current.setValue(value);
    }
  };

  return (
    <>
      <ButtonText>{label}</ButtonText>
      <WysiwygWrapper paddingTop={1} hasRadius error={error}>
        <WysiwygNav
          placeholder={placeholder}
          onActionClick={handleActionClick}
          visiblePopover={visiblePopover}
          onTogglePopover={handleTogglePopover}
          isPreviewMode={isPreviewMode}
          onTogglePreviewMode={handleTogglePreviewMode}
          onToggleMediaLib={handleToggleMediaLib}
          editorRef={editorRef}
        />
        <Editor
          name={name}
          onChange={onChange}
          textareaRef={textareaRef}
          editorRef={editorRef}
          isPreviewMode={isPreviewMode}
          value={value}
          error={error}
        />
        <WysiwygFooter isPreviewMode={isPreviewMode} onToggleExpand={handleToggleExpand} />
      </WysiwygWrapper>
      {error && (
        <Box paddingTop={1}>
          <P small textColor="danger600" data-strapi-field-error>
            {error}
          </P>
        </Box>
      )}
      {mediaLibVisible && (
        <MediaLibrary
          editorRef={editorRef}
          onToggleMediaLib={handleToggleMediaLib}
          onTogglePopover={handleTogglePopover}
          onSubmitImage={handleSubmitImage}
        />
      )}
      {isExpandMode && (
        <WysiwygExpand
          onToggleExpand={handleToggleExpand}
          value={value}
          placeholder={placeholder}
          onActionClick={handleActionClick}
          onChange={onChange}
          textareaRef={textareaRef}
          editorRef={editorRefExpanded}
          onSubmitImage={handleSubmitImage}
        />
      )}
    </>
  );
};

Wysiwyg.defaultProps = {
  label: '',
  onChange: () => {},
  placeholder: '',
  value: '',
};

Wysiwyg.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default Wysiwyg;
