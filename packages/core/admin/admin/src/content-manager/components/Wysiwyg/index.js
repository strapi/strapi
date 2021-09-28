import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { ButtonText, P } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
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

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Wysiwyg = ({
  // description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  placeholder,
  value,
}) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  // FIXME
  // const hint = description
  //   ? formatMessage(
  //       { id: description.id, defaultMessage: description.defaultMessage },
  //       { ...description.values }
  //     )
  //   : '';

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
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
      default: {
        // Nothing
      }
    }
  };

  const handleSubmitImage = (files, currentEditorRef, toggleMediaLib, togglePopover) => {
    toggleMediaLib();
    togglePopover();
    insertImage(currentEditorRef, files);
  };

  const handleToggleExpand = () => {
    setIsExpandMode(prev => !prev);
  };

  return (
    <>
      <Row>
        <ButtonText>{label}</ButtonText>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Row>
      <WysiwygWrapper hasRadius error={error}>
        <WysiwygNav
          editorRef={editorRef}
          isPreviewMode={isPreviewMode}
          onActionClick={handleActionClick}
          onToggleMediaLib={handleToggleMediaLib}
          onTogglePopover={handleTogglePopover}
          onTogglePreviewMode={handleTogglePreviewMode}
          visiblePopover={visiblePopover}
        />
        <Editor
          disabled={disabled}
          editorRef={editorRef}
          error={errorMessage}
          isPreviewMode={isPreviewMode}
          name={name}
          onChange={onChange}
          placeholder={formattedPlaceholder}
          textareaRef={textareaRef}
          value={value}
        />
        <WysiwygFooter isPreviewMode={isPreviewMode} onToggleExpand={handleToggleExpand} />
      </WysiwygWrapper>
      {errorMessage && (
        <Box paddingTop={1}>
          <P small textColor="danger600" data-strapi-field-error>
            {errorMessage}
          </P>
        </Box>
      )}
      {mediaLibVisible && (
        <MediaLibrary
          editorRef={editorRef}
          onSubmitImage={handleSubmitImage}
          onToggleMediaLib={handleToggleMediaLib}
          onTogglePopover={handleTogglePopover}
        />
      )}
      {isExpandMode && (
        <WysiwygExpand
          disabled={disabled}
          editorRef={editorRefExpanded}
          name={name}
          onActionClick={handleActionClick}
          onChange={onChange}
          onSubmitImage={handleSubmitImage}
          onToggleExpand={handleToggleExpand}
          placeholder={formattedPlaceholder}
          textareaRef={textareaRef}
          value={value}
        />
      )}
    </>
  );
};

Wysiwyg.defaultProps = {
  description: null,
  disabled: true,
  error: '',
  labelAction: undefined,
  placeholder: null,
  value: '',
};

Wysiwyg.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  value: PropTypes.string,
};

export default Wysiwyg;
