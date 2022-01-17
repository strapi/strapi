import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import Editor from './Editor';
import WysiwygNav from './WysiwygNav';
import WysiwygFooter from './WysiwygFooter';
import Hint from '../Hint';

import {
  markdownHandler,
  listHandler,
  titleHandler,
  insertFile,
  quoteAndCodeHandler,
} from './utils/utils';
import { EditorLayout } from './EditorLayout';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const Wysiwyg = ({
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  placeholder,
  value,
  required,
}) => {
  const { formatMessage } = useIntl();
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [mediaLibVisible, setMediaLibVisible] = useState(false);
  const [isExpandMode, setIsExpandMode] = useState(false);
  const { components } = useLibrary();

  const MediaLibraryDialog = components['media-library'];

  const handleToggleMediaLib = () => setMediaLibVisible(prev => !prev);
  const handleTogglePreviewMode = () => setIsPreviewMode(prev => !prev);
  const handleToggleExpand = () => {
    setIsPreviewMode(false);
    setIsExpandMode(prev => !prev);
  };

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

  const handleSelectAssets = files => {
    const formattedFiles = files.map(f => ({
      alt: f.alternativeText || f.name,
      url: prefixFileUrlWithBackendUrl(f.url),
      mime: f.mime,
    }));

    insertFile(editorRef, formattedFiles);
    setMediaLibVisible(false);
  };

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return (
    <>
      <Stack size={1}>
        <Stack horizontal size={1}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {label}
            {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
          </Typography>
          {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
        </Stack>

        <EditorLayout
          isExpandMode={isExpandMode}
          error={error}
          previewContent={value}
          onCollapse={handleToggleExpand}
        >
          <WysiwygNav
            editorRef={editorRef}
            isPreviewMode={isPreviewMode}
            onActionClick={handleActionClick}
            onToggleMediaLib={handleToggleMediaLib}
            onTogglePreviewMode={isExpandMode ? undefined : handleTogglePreviewMode}
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

          {!isExpandMode && <WysiwygFooter onToggleExpand={handleToggleExpand} />}
        </EditorLayout>
        <Hint description={description} name={name} error={error} />
      </Stack>

      {errorMessage && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600" data-strapi-field-error>
            {errorMessage}
          </Typography>
        </Box>
      )}

      {mediaLibVisible && (
        <MediaLibraryDialog onClose={handleToggleMediaLib} onSelectAssets={handleSelectAssets} />
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
  required: false,
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
  required: PropTypes.bool,
  value: PropTypes.string,
};

export default Wysiwyg;
