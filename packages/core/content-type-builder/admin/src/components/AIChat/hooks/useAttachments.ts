import { useCallback } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';

import { useStrapiChat } from '../providers/ChatProvider';

export function useAttachments() {
  const { setFiles, files } = useStrapiChat();
  const { toggleNotification } = useNotification();

  const attachFiles = useCallback(
    (newFiles: File[] | FileList, description?: string) => {
      // Create a new DataTransfer to combine existing and new files
      const dt = new DataTransfer();

      // Add existing files first if any
      if (files?.length) {
        Array.from(files).forEach((file) => {
          dt.items.add(file);
        });
      }

      // TODO: If attaching a code file, add remove the previous one

      // Add new files
      Array.from(newFiles).forEach((file) => {
        dt.items.add(file);
      });

      setFiles(dt.files);

      if (description) {
        toggleNotification({
          title: 'Files attached',
          message: description,
        });
      }
    },
    [files, setFiles]
  );

  const removeFile = useCallback(
    (file: File) => {
      if (!files) return;

      // Convert FileList to Array and filter out the removed file
      const remainingFiles = Array.from(files).filter(
        (f) => f.name !== file.name && f.size !== file.size
      );

      if (remainingFiles.length === 0) {
        setFiles(undefined);
        return;
      }

      // Create a new FileList using DataTransfer
      const dt = new DataTransfer();
      remainingFiles.forEach((file) => dt.items.add(file));
      setFiles(dt.files);
    },
    [setFiles, files]
  );

  const removeFileByIndex = useCallback(
    (index: number) => {
      if (!files) return;
      const remainingFiles = Array.from(files).filter((_, i) => i !== index);
      if (remainingFiles.length === 0) {
        setFiles(undefined);
        return;
      }
      const dt = new DataTransfer();
      remainingFiles.forEach((file) => dt.items.add(file));
      setFiles(dt.files);
    },
    [setFiles, files]
  );

  return { files, attachFiles, removeFile, removeFileByIndex };
}
