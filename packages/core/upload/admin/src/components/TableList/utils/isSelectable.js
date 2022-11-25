export const isSelectable = (allowedTypes, elementType, fileType, isFolderSelectionAllowed) => {
  let canSelectElement;

  if (elementType === 'folder') {
    canSelectElement = isFolderSelectionAllowed;
  } else {
    canSelectElement =
      allowedTypes.includes(fileType) ||
      (allowedTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType));
  }

  return canSelectElement;
};
