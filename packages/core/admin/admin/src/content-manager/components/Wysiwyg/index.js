import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Typography, Box, Flex } from '@strapi/design-system';
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
  hint,
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

  const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);
  const handleTogglePreviewMode = () => setIsPreviewMode((prev) => !prev);
  const handleToggleExpand = () => {
    setIsPreviewMode(false);
    setIsExpandMode((prev) => !prev);
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

  const handleSelectAssets = (files) => {
    const formattedFiles = files.map((f) => ({
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

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  return (
    <>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Flex gap={1}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {label}
            {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
          </Typography>
          {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
        </Flex>

        <EditorLayout
          isExpandMode={isExpandMode}
          error={error}
          previewContent={value}
          onCollapse={handleToggleExpand}
        >
          <WysiwygNav
            isExpandMode={isExpandMode}
            editorRef={editorRef}
            isPreviewMode={isPreviewMode}
            onActionClick={handleActionClick}
            onToggleMediaLib={handleToggleMediaLib}
            onTogglePreviewMode={isExpandMode ? undefined : handleTogglePreviewMode}
            disabled={disabled}
          />

          <Editor
            disabled={disabled}
            isExpandMode={isExpandMode}
            editorRef={editorRef}
            error={error}
            isPreviewMode={isPreviewMode}
            name={name}
            onChange={onChange}
            placeholder={formattedPlaceholder}
            textareaRef={textareaRef}
            value={value}
          />

          {!isExpandMode && <WysiwygFooter onToggleExpand={handleToggleExpand} />}
        </EditorLayout>
        <Hint hint={hint} name={name} error={error} />
      </Flex>

      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600" data-strapi-field-error>
            {error}
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
  disabled: false,
  error: '',
  labelAction: undefined,
  placeholder: null,
  required: false,
  value: '',
  hint: '',
};

Wysiwyg.propTypes = {
  hint: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
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
