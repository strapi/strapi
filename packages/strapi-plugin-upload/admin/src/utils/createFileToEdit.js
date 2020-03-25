const createFileToEdit = file => ({
  id: file.id,
  abortController: new AbortController(),
  file,
  fileInfo: {
    alternativeText: file.alternativeText,
    caption: file.caption,
    name: file.name,
  },
  hasError: false,
  errorMessage: null,
  isUploading: false,
});

export default createFileToEdit;
