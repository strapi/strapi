const switchIdForDocumentId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  output.id = output.documentId;
  delete output.documentId;
  return output;
};

export { switchIdForDocumentId };
