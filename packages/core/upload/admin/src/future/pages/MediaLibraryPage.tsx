import * as React from 'react';

import { Layouts, useNotification } from '@strapi/admin/strapi-admin';
import { MenuItem, SimpleMenu, VisuallyHidden } from '@strapi/design-system';
import { ChevronDown, Files } from '@strapi/icons';

import { useTranslation } from '../hooks/useTranslation';
import { useUploadFilesMutation } from '../services/api';

export const MediaLibraryPage = () => {
  const { t } = useTranslation();
  const { toggleNotification } = useNotification();
  const fileInputRef = React.useRef<HTMLInputElement>(null!);
  const [uploadFiles] = useUploadFilesMutation();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      const filesArray = Array.from(files);

      // Add files and fileInfo to the form data
      filesArray.forEach((file) => {
        formData.append('files', file);
        formData.append(
          'fileInfo',
          JSON.stringify({
            name: file.name,
            caption: null,
            alternativeText: null,
            folder: null,
          })
        );
      });

      try {
        // unwrap() is needed to throw errors and trigger the catch block
        // Without it, RTK Query never rejects and catch would never execute
        await uploadFiles(formData).unwrap();
        toggleNotification({
          type: 'success',
          message: t(
            'assets.uploaded',
            '{number, plural, one {# asset} other {# assets}} uploaded successfully',
            { number: filesArray.length }
          ),
        });
      } catch (error) {
        toggleNotification({
          type: 'danger',
          message: t('upload.generic-error', 'An error occurred while uploading the file.'),
        });
      }
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <Layouts.Root>
      <VisuallyHidden>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple />
      </VisuallyHidden>
      <Layouts.Header
        title="TODO: Folder location"
        primaryAction={
          <SimpleMenu
            popoverPlacement="bottom-end"
            variant="default"
            endIcon={<ChevronDown />}
            label={t('new', 'New')}
          >
            <MenuItem onSelect={handleFileSelect} startIcon={<Files />}>
              {t('import-files', 'Import files')}
            </MenuItem>
          </SimpleMenu>
        }
      />

      <Layouts.Content>TODO: List/Grid views</Layouts.Content>
    </Layouts.Root>
  );
};
