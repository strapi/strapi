import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { prefixFileUrlWithBackendUrl, TranslationMessage, useLibrary } from '@strapi/helper-plugin';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { Hint, HintProps } from '../Hint';

import { Editor, EditorApi, EditorProps } from './Editor';
import { EditorLayout, EditorLayoutProps } from './EditorLayout';
import {
  insertFile,
  listHandler,
  markdownHandler,
  quoteAndCodeHandler,
  titleHandler,
} from './utils/utils';
import { WysiwygFooter } from './WysiwygFooter';
import { WysiwygNav } from './WysiwygNav';

interface WysiwygProps
  extends Pick<EditorProps, 'disabled' | 'name' | 'onChange' | 'value'>,
    Pick<EditorLayoutProps, 'error'>,
    Pick<HintProps, 'hint'> {
  intlLabel: TranslationMessage;
  labelAction?: React.ReactNode;
  placeholder?: TranslationMessage;
  required?: boolean;
}

const Wysiwyg = React.forwardRef<EditorApi, WysiwygProps>(
  (
    { hint, disabled, error, intlLabel, labelAction, name, onChange, placeholder, value, required },
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const editorRef = React.useRef<EditorFromTextArea>(
      null
    ) as React.MutableRefObject<EditorFromTextArea>;
    const [isPreviewMode, setIsPreviewMode] = React.useState(false);
    const [mediaLibVisible, setMediaLibVisible] = React.useState(false);
    const [isExpandMode, setIsExpandMode] = React.useState(false);
    const { components = {} } = useLibrary();

    const MediaLibraryDialog = components['media-library'];

    const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);
    const handleTogglePreviewMode = () => setIsPreviewMode((prev) => !prev);
    const handleToggleExpand = () => {
      setIsPreviewMode(false);
      setIsExpandMode((prev) => !prev);
    };

    const handleActionClick = (
      value: string,
      currentEditorRef: React.MutableRefObject<EditorFromTextArea>,
      togglePopover?: () => void
    ) => {
      switch (value) {
        case 'Link':
        case 'Strikethrough': {
          markdownHandler(currentEditorRef, value);
          togglePopover?.();
          break;
        }
        case 'Code':
        case 'Quote': {
          quoteAndCodeHandler(currentEditorRef, value);
          togglePopover?.();
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
          togglePopover?.();
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

    const handleSelectAssets = (files: any[]) => {
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
              ref={forwardedRef}
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
          // @ts-expect-error – TODO: fix this way of injecting because it's not really typeable without a registry.
          <MediaLibraryDialog onClose={handleToggleMediaLib} onSelectAssets={handleSelectAssets} />
        )}
      </>
    );
  }
);

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

export { Wysiwyg };
export type { WysiwygProps };
