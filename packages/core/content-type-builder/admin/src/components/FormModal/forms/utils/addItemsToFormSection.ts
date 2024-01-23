type SectionTitle = {
  id: string;
  defaultMessage: string;
};

type Item = {
  intlLabel: {
    id: string;
    defaultMessage: string;
  };
  description?: { id: string; defaultMessage: string };
  name: string;
  type: string;
  value?: string;
  options?: {
    key: string;
    value: string;
    metadatas: {
      intlLabel: {
        id: string;
        defaultMessage: string;
      };
    };
  }[];
};

type FormTypeOption = {
  sectionTitle: SectionTitle | null;
  items: Item[];
};

export type FormTypeOptions = Array<FormTypeOption>;

/**
 * @description
 * Adds form options to the default section or as a new section
 */
export const addItemsToFormSection = (
  formTypeOptions: FormTypeOptions | Item[],
  sections: FormTypeOptions
) => {
  formTypeOptions.forEach((item) => {
    if (!('sectionTitle' in item)) {
      // When there is no sectionTitle key,
      // add the item to the default section
      sections[0].items?.push(item);
      return;
    }

    // Otherwise, when sectionTitle has a value (including null),
    // add the item as a new section
    sections.push(item);
  });
};
