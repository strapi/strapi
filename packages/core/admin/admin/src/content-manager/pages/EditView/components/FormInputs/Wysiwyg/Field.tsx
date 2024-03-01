import * as React from 'react';

import { Field, FieldError, FieldHint, FieldLabel, Flex } from '@strapi/design-system';
import { prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import { EditorFromTextArea } from 'codemirror5';

import { useField } from '../../../../../components/Form';

import { Editor, EditorApi } from './Editor';
import { EditorLayout } from './EditorLayout';
import {
  insertFile,
  listHandler,
  markdownHandler,
  quoteAndCodeHandler,
  titleHandler,
} from './utils/utils';
import { WysiwygFooter } from './WysiwygFooter';
import { WysiwygNav } from './WysiwygNav';

import type { InputProps } from '../../../../../components/FormInputs/types';
import type { Schema } from '@strapi/types';

interface WysiwygProps extends Omit<InputProps, 'type'> {
  labelAction?: React.ReactNode;
  type: Schema.Attribute.RichText['type'];
}

const Wysiwyg = React.forwardRef<EditorApi, WysiwygProps>(
  ({ hint, disabled, label, name, placeholder, required }, forwardedRef) => {
    const field = useField(name);
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

    return (
      <Field name={name} hint={hint} error={field.error} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <FieldLabel>{label}</FieldLabel>
          <EditorLayout
            isExpandMode={isExpandMode}
            error={field.error}
            previewContent={field.value}
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
              error={field.error}
              isPreviewMode={isPreviewMode}
              name={name}
              onChange={field.onChange}
              placeholder={placeholder}
              textareaRef={textareaRef}
              value={field.value}
              ref={forwardedRef}
            />

            {!isExpandMode && <WysiwygFooter onToggleExpand={handleToggleExpand} />}
          </EditorLayout>
          <FieldHint />
          <FieldError />
        </Flex>
        {mediaLibVisible && (
          // @ts-expect-error – TODO: fix this way of injecting because it's not really typeable without a registry.
          <MediaLibraryDialog onClose={handleToggleMediaLib} onSelectAssets={handleSelectAssets} />
        )}
      </Field>
    );
  }
);

export { Wysiwyg };
export type { WysiwygProps };
