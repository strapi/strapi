export default function hasContent(type, content, metadatas, fieldSchema) {
  let normalizedContent = content;

  if (type === 'component') {
    const { mainField } = metadatas;

    if (fieldSchema.repeatable) {
      normalizedContent = content?.[0]?.[mainField];
    } else {
      normalizedContent = content?.[mainField];
    }
  }

  if (normalizedContent === undefined || content?.length === 0) {
    normalizedContent = null;
  }

  return !!normalizedContent;
}
