const getCustomFieldUidsFromLayout = (layout) => {
  if (!layout) return [];
  // Get all the fields on the content-type and its components
  const allFields = [
    ...layout.contentType.layouts.edit,
    ...Object.values(layout.components).flatMap((component) => component.layouts.edit),
  ].flat();
  // Filter that down to custom fields and map the uids
  const customFieldUids = allFields
    .filter((field) => field.fieldSchema.customField)
    .map((customField) => customField.fieldSchema.customField);
  // Make sure the list is unique
  const uniqueCustomFieldUids = [...new Set(customFieldUids)];

  return uniqueCustomFieldUids;
};

export default getCustomFieldUidsFromLayout;
