const switchIdForDocumentId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  const documentId = output.documentId;
  delete output.documentId;
  output.id = documentId;
  return output;
};

export { switchIdForDocumentId };
