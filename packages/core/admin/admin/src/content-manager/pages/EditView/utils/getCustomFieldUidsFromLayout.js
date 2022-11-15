const getCustomFieldUidsFromLayout = (layout) => {
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
  const uniqueCustomFieldUids = customFieldUids.filter(
    (uid, index) => customFieldUids.indexOf(uid) === index
  );

  return uniqueCustomFieldUids;
};

export default getCustomFieldUidsFromLayout;
