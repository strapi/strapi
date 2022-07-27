/**
 * @description
 * Adds form options to the default section or as a new section
 * @param {array} formTypeOptions Base or advanced options
 * @param {array} sections The sections to mutate
 */
const addItemsToFormSection = (formTypeOptions, sections) => {
  formTypeOptions.forEach(item => {
    if (!item.sectionTitle) {
      // When there is no sectionTitle or the sectionTitle is null,
      // add the item to the default section
      return sections[0].items.push(item);
    }

    // Otherwise add the item as a new section
    return sections.push(item);
  });
};

export default addItemsToFormSection;
