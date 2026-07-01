import * as React from 'react';

import {
  useField,
  useStrapiApp,
  useIsMobile,
  useNotification,
  type InputProps,
} from '@strapi/admin/strapi-admin';
import { Box, Field, Flex } from '@strapi/design-system';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';

import { prefixFileUrlWithBackendUrl } from '../../../../../utils/urls';

import { Editor, EditorApi } from './Editor';
import { EditorLayout } from './EditorLayout';
import { useWysiwygImageUpload } from './hooks/useWysiwygImageUpload';
import { insertFile } from './utils/utils';
import { WysiwygFooter } from './WysiwygFooter';
import { WysiwygNav, WysiwygPreviewToggleButton } from './WysiwygNav';

import type { Schema } from '@strapi/types';

interface WysiwygProps extends Omit<InputProps, 'type'> {
  labelAction?: React.ReactNode;
  type: Schema.Attribute.RichText['type'];
}

const Wysiwyg = React.forwardRef<EditorApi, WysiwygProps>(
  ({ hint, disabled, label, name, placeholder, required, labelAction }, forwardedRef) => {
    const field = useField(name);
    const { formatMessage } = useIntl();
    const { toggleNotification } = useNotification();
    const { uploadImages } = useWysiwygImageUpload();
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const editorRef = React.useRef<EditorFromTextArea>(
      null
    ) as React.MutableRefObject<EditorFromTextArea>;
    const [isPreviewMode, setIsPreviewMode] = React.useState(false);
    const [mediaLibVisible, setMediaLibVisible] = React.useState(false);
    const [isExpandMode, setIsExpandMode] = React.useState(false);
    const isMobile = useIsMobile();
    const components = useStrapiApp('ImageDialog', (state) => state.components);

    const MediaLibraryDialog = components['media-library'];

    const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);
    const handleTogglePreviewMode = () => setIsPreviewMode((prev) => !prev);
    const handleToggleExpand = () => {
      setIsPreviewMode(false);
      setIsExpandMode((prev) => !prev);
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

    const handlePasteFiles = React.useCallback(
      async (event: ClipboardEvent) => {
        if (disabled || isPreviewMode) {
          return;
        }

        const clipboardItems = event.clipboardData?.items;

        if (!clipboardItems?.length) {
          return;
        }

        const files = Array.from(clipboardItems)
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);

        if (!files.length) {
          return;
        }

        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        if (!imageFiles.length) {
          toggleNotification({
            type: 'warning',
            message: formatMessage({
              id: 'components.Wysiwyg.paste.nonImage',
              defaultMessage: 'Only image files can be pasted into the markdown editor.',
            }),
          });
          return;
        }

        event.preventDefault();

        try {
          const uploadedFiles = await uploadImages(imageFiles);

          const formattedFiles = uploadedFiles.map((file) => ({
            alt: file.alternativeText || file.name,
            url: prefixFileUrlWithBackendUrl(file.url),
            mime: file.mime,
          }));

          insertFile(editorRef, formattedFiles);
        } catch {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'components.Wysiwyg.paste.uploadError',
              defaultMessage: 'An error occurred while uploading the pasted image.',
            }),
          });
        }
      },
      [disabled, formatMessage, isPreviewMode, toggleNotification, uploadImages]
    );

    return (
      <Field.Root name={name} hint={hint} error={field.error} required={required}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label action={labelAction}>{label}</Field.Label>
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
              onPasteFiles={handlePasteFiles}
              placeholder={placeholder}
              textareaRef={textareaRef}
              value={field.value}
              ref={forwardedRef}
            />
            {!isExpandMode && !isMobile && <WysiwygFooter onToggleExpand={handleToggleExpand} />}
            {isMobile && (
              <Box position="absolute" bottom={0} right={0} left={0} pointerEvents="none">
                <Flex justifyContent="flex-end" padding={4}>
                  <Box pointerEvents="auto" display="inline-flex">
                    <WysiwygPreviewToggleButton
                      isPreviewMode={isPreviewMode}
                      onTogglePreviewMode={handleTogglePreviewMode}
                    />
                  </Box>
                </Flex>
              </Box>
            )}
          </EditorLayout>
          <Field.Hint />
          <Field.Error />
        </Flex>
        {mediaLibVisible && (
          // @ts-expect-error – TODO: fix this way of injecting because it's not really typeable without a registry.
          <MediaLibraryDialog onClose={handleToggleMediaLib} onSelectAssets={handleSelectAssets} />
        )}
      </Field.Root>
    );
  }
);

const MemoizedWysiwyg = React.memo(Wysiwyg);

export { MemoizedWysiwyg as Wysiwyg };
export type { WysiwygProps };
